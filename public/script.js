function boot() {
  if (!window.React || !window.ReactDOM || !window.antd) {
    window.setTimeout(boot, 60);
    return;
  }

const { useMemo, useState } = React;
const {
  App,
  Button,
  Card,
  Collapse,
  ConfigProvider,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Typography,
  Upload,
  message
} = antd;

const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const selectOptions = {
  size: [
    { label: "auto", value: "auto" },
    { label: "1024 x 1024", value: "1024x1024" },
    { label: "1536 x 1024", value: "1536x1024" },
    { label: "1024 x 1536", value: "1024x1536" },
    { label: "768 x 768", value: "768x768" },
    { label: "512 x 512", value: "512x512" },
    { label: "1792 x 1024", value: "1792x1024" },
    { label: "1024 x 1792", value: "1024x1792" },
    { label: "1344 x 768", value: "1344x768" },
    { label: "768 x 1344", value: "768x1344" },
    { label: "1920 x 1080", value: "1920x1080" },
    { label: "1080 x 1920", value: "1080x1920" },
    { label: "1280 x 720", value: "1280x720" },
    { label: "720 x 1280", value: "720x1280" }
  ],
  quality: [
    { label: "默认", value: "" },
    { label: "auto", value: "auto" },
    { label: "low", value: "low" },
    { label: "medium", value: "medium" },
    { label: "high", value: "high" }
  ],
  background: [
    { label: "默认", value: "" },
    { label: "auto", value: "auto" },
    { label: "opaque", value: "opaque" },
    { label: "transparent", value: "transparent" }
  ],
  outputFormat: [
    { label: "默认", value: "" },
    { label: "png", value: "png" },
    { label: "jpeg", value: "jpeg" },
    { label: "webp", value: "webp" }
  ],
  moderation: [
    { label: "默认", value: "" },
    { label: "auto", value: "auto" },
    { label: "low", value: "low" }
  ],
  inputFidelity: [
    { label: "默认", value: "" },
    { label: "low", value: "low" },
    { label: "high", value: "high" }
  ]
};

function compactParams(values, includeEditOnly) {
  const params = {
    model: values.model,
    prompt: values.prompt,
    size: values.size,
    n: values.n,
    quality: values.quality,
    background: values.background,
    output_format: values.outputFormat,
    output_compression: values.outputCompression,
    moderation: values.moderation
  };

  if (includeEditOnly) {
    params.input_fidelity = values.inputFidelity;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function fileFromUpload(value) {
  return value?.fileList?.[0]?.originFileObj || null;
}

function ImageWorkbench() {
  const [form] = Form.useForm();
  const [mode, setMode] = useState("generate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState("输入提示词后开始。");
  const selectedImage = images[selectedIndex] || images[0];

  const initialValues = useMemo(
    () => ({
      model: "gpt-image-2",
      prompt: "",
      size: "auto",
      n: 1,
      quality: "",
      background: "",
      outputFormat: "",
      moderation: "",
      inputFidelity: ""
    }),
    []
  );

  async function submit(values) {
    const prompt = values.prompt?.trim();
    if (!prompt) {
      message.warning("请输入提示词");
      return;
    }

    setLoading(true);
    setResult(null);
    setImages([]);
    setSelectedIndex(0);
    setStatus(mode === "edit" ? "正在编辑图片，通常需要几十秒..." : "正在生成图片，通常需要几十秒...");

    try {
      if (mode === "edit") {
        const response = await requestEdit(values);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "处理失败。");
        }

        const nextImages = data.images?.length ? data.images : [data.image];
        setResult(data);
        setImages(nextImages);
        setSelectedIndex(0);
        setStatus(`编辑完成，共 ${nextImages.length} 张。模型：${data.model}`);
        message.success("编辑完成");
        return;
      }

      await requestGenerateStream(values);
      message.success("生成完成");
    } catch (error) {
      const text = error instanceof Error ? error.message : "处理失败。";
      setStatus(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  }

  async function requestGenerateStream(values) {
    const expectedCount = Number(values.n || 1);
    let receivedCount = 0;
    let modelName = values.model || "gpt-image-2";
    const response = await fetch("/api/generate-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compactParams(values, false))
    });

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "生成失败。");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);

        if (event.type === "start") {
          modelName = event.model || modelName;
          setStatus(`开始生成，共 ${event.total} 张...`);
        }

        if (event.type === "image") {
          receivedCount += 1;
          setResult({ model: event.model || modelName });
          setImages((previous) => {
            const next = [...previous, event.image];
            setSelectedIndex(next.length - 1);
            return next;
          });
          setStatus(`已生成 ${receivedCount} / ${expectedCount} 张。模型：${event.model || modelName}`);
        }

        if (event.type === "error") {
          throw new Error(event.error || "生成失败。");
        }
      }
    }

    setStatus(`生成完成，共 ${receivedCount} 张。模型：${modelName}`);
  }

  async function requestEdit(values) {
    const image = fileFromUpload(values.image);
    if (!image) {
      throw new Error("请先上传要编辑的原图。");
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(compactParams(values, true))) {
      formData.append(key, value);
    }
    formData.append("image", image);

    const mask = fileFromUpload(values.mask);
    if (mask) {
      formData.append("mask", mask);
    }

    return fetch("/api/edit", {
      method: "POST",
      body: formData
    });
  }

  function beforeUpload() {
    return false;
  }

  return (
    React.createElement(ConfigProvider, {
      theme: {
        token: {
          colorPrimary: "#126b57",
          borderRadius: 8,
          fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
        }
      }
    },
      React.createElement(App, null,
        React.createElement("main", { className: "app-shell" },
          React.createElement("section", { className: "workbench" },
            React.createElement(Card, { className: "control-card", bordered: false },
              React.createElement(Space, { direction: "vertical", size: 18, className: "full-width" },
                React.createElement(Segmented, {
                  block: true,
                  value: mode,
                  onChange: (value) => {
                    setMode(value);
                    setStatus(value === "edit" ? "上传原图，输入编辑要求后开始。" : "输入提示词后开始。");
                  },
                  options: [
                    { label: "生成", value: "generate" },
                    { label: "编辑", value: "edit" }
                  ]
                }),
                React.createElement(Form, {
                  form,
                  layout: "vertical",
                  initialValues,
                  onFinish: submit,
                  requiredMark: false
                },
                  mode === "edit" &&
                    React.createElement("div", { className: "upload-grid" },
                      React.createElement(Form.Item, { label: "原图", name: "image", valuePropName: "file", className: "compact-form-item" },
                        React.createElement(Dragger, {
                          accept: "image/png,image/jpeg,image/webp",
                          beforeUpload,
                          maxCount: 1,
                          listType: "picture",
                          multiple: false
                        },
                          React.createElement("p", { className: "upload-title" }, "添加原图"),
                        )
                      ),
                      React.createElement(Form.Item, { label: "蒙版", name: "mask", valuePropName: "file", className: "compact-form-item" },
                        React.createElement(Dragger, {
                          accept: "image/png,image/jpeg,image/webp",
                          beforeUpload,
                          maxCount: 1,
                          listType: "picture",
                          multiple: false
                        },
                          React.createElement("p", { className: "upload-title" }, "添加蒙版")
                        )
                      )
                    ),
                  React.createElement(Form.Item, {
                    label: "提示词",
                    name: "prompt",
                    rules: [{ required: true, message: "请输入提示词" }]
                  },
                    React.createElement(TextArea, {
                      rows: 7,
                      placeholder: mode === "edit" ? "例如：只把人物头发改成自然铜红色，其他保持不变。" : "描述你想生成的图片。",
                      showCount: true,
                      maxLength: 2000
                    })
                  ),
                  React.createElement(Collapse, {
                    ghost: false,
                    className: "advanced-panel",
                    items: [{
                      key: "params",
                      label: "高级参数",
                      children: React.createElement("div", { className: "param-grid" },
                        React.createElement(Form.Item, { label: "模型", name: "model" }, React.createElement(Input, null)),
                        React.createElement(Form.Item, { label: "尺寸", name: "size" }, React.createElement(Select, { options: selectOptions.size })),
                        React.createElement(Form.Item, { label: "数量", name: "n" }, React.createElement(InputNumber, { min: 1, max: 10, className: "full-width" })),
                        React.createElement(Form.Item, { label: "质量", name: "quality" }, React.createElement(Select, { options: selectOptions.quality })),
                        React.createElement(Form.Item, { label: "背景", name: "background" }, React.createElement(Select, { options: selectOptions.background })),
                        React.createElement(Form.Item, { label: "输出格式", name: "outputFormat" }, React.createElement(Select, { options: selectOptions.outputFormat })),
                        React.createElement(Form.Item, { label: "压缩", name: "outputCompression" }, React.createElement(InputNumber, { min: 0, max: 100, placeholder: "0-100", className: "full-width" })),
                        React.createElement(Form.Item, { label: "审核", name: "moderation" }, React.createElement(Select, { options: selectOptions.moderation })),
                        mode === "edit" && React.createElement(Form.Item, { label: "参考强度", name: "inputFidelity" }, React.createElement(Select, { options: selectOptions.inputFidelity }))
                      )
                    }]
                  }),
                  React.createElement(Divider, { className: "form-divider" }),
                  React.createElement(Button, {
                    type: "primary",
                    htmlType: "submit",
                    size: "large",
                    block: true,
                    loading
                  }, mode === "edit" ? "编辑图片" : "生成图片"),
                  React.createElement(Text, { className: status.startsWith("正在") ? "status-text" : "status-text muted" }, status)
                )
              )
            ),
            React.createElement(Card, { className: "result-card", bordered: false },
              React.createElement("div", { className: "result-stage" },
                loading && images.length === 0 && React.createElement(Spin, { size: "large", tip: mode === "edit" ? "正在编辑图片" : "正在生成图片" }),
                !loading && images.length === 0 && React.createElement(Empty, {
                  image: Empty.PRESENTED_IMAGE_SIMPLE,
                  description: "等待生成"
                }),
                images.length > 0 && React.createElement("div", { className: "result-viewer" },
                  React.createElement("div", { className: "main-image-wrap" },
                    React.createElement("button", { className: "image-preview-button", type: "button", onClick: () => setPreviewOpen(true), "aria-label": "放大预览图片" },
                      React.createElement("img", { className: "result-image", src: selectedImage, alt: `选中的图片 ${selectedIndex + 1}` })
                    )
                  ),
                  React.createElement("div", { className: "result-toolbar" },
                    React.createElement("span", null, `当前 ${selectedIndex + 1} / ${images.length}`),
                    React.createElement("a", { className: "download-link", href: selectedImage, download: `image-${selectedIndex + 1}.png` }, "下载图片")
                  ),
                  React.createElement("div", { className: "thumbnail-strip", "aria-label": "缩略图列表" },
                    images.map((image, index) =>
                      React.createElement("button", {
                        className: index === selectedIndex ? "thumb active" : "thumb",
                        key: `${image.slice(0, 32)}-${index}`,
                        type: "button",
                        onClick: () => setSelectedIndex(index),
                        "aria-label": `查看第 ${index + 1} 张图片`
                      },
                        React.createElement("img", { src: image, alt: `缩略图 ${index + 1}` }),
                        React.createElement("span", null, index + 1)
                      )
                    )
                  )
                ),
                React.createElement(Modal, {
                  centered: true,
                  footer: null,
                  open: previewOpen,
                  width: "min(92vw, 1100px)",
                  onCancel: () => setPreviewOpen(false),
                  className: "image-preview-modal"
                },
                  selectedImage && React.createElement("img", { className: "modal-preview-image", src: selectedImage, alt: `放大预览图片 ${selectedIndex + 1}` })
                )
              )
            )
          )
        )
      )
    )
  );
}

ReactDOM.createRoot(document.querySelector("#root")).render(React.createElement(ImageWorkbench));
}

boot();
