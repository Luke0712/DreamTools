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
  model: [
    { label: "gpt-image-2", value: "gpt-image-2" }
  ],
  speechModel: [
    { label: "speech-2.8-turbo", value: "speech-2.8-turbo" },
    { label: "speech-2.8-hd", value: "speech-2.8-hd" }
  ],
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
  ],
  voice: [
    { label: "中文 - 抒情", value: "Chinese (Mandarin)_Lyrical_Voice" },
    { label: "中文 - 港航乘务", value: "Chinese (Mandarin)_HK_Flight_Attendant" },
    { label: "中文 - moss 1", value: "moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85" },
    { label: "中文 - moss 2", value: "moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d" },
    { label: "英文 - 优雅女声", value: "English_Graceful_Lady" },
    { label: "英文 - 洞察讲者", value: "English_Insightful_Speaker" },
    { label: "英文 - 明亮女孩", value: "English_radiant_girl" },
    { label: "英文 - 说服男声", value: "English_Persuasive_Man" },
    { label: "英文 - moss 1", value: "moss_audio_6dc281eb-713c-11f0-a447-9613c873494c" },
    { label: "英文 - moss 2", value: "moss_audio_570551b1-735c-11f0-b236-0adeeecad052" },
    { label: "英文 - moss 3", value: "moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8" },
    { label: "英文 - 机器人", value: "English_Lucky_Robot" },
    { label: "日文 - 低语女声", value: "Japanese_Whisper_Belle" },
    { label: "日文 - moss 1", value: "moss_audio_24875c4a-7be4-11f0-9359-4e72c55db738" },
    { label: "日文 - moss 2", value: "moss_audio_7f4ee608-78ea-11f0-bb73-1e2a4cfcd245" },
    { label: "日文 - moss 3", value: "moss_audio_c1a6a3ac-7be6-11f0-8e8e-36b92fbb4f95" }
  ],
  languageBoost: [
    { label: "中文", value: "Chinese" },
    { label: "粤语", value: "Chinese,Yue" },
    { label: "英文", value: "English" },
    { label: "日文", value: "Japanese" },
    { label: "韩文", value: "Korean" },
    { label: "法文", value: "French" },
    { label: "德文", value: "German" },
    { label: "西班牙文", value: "Spanish" },
    { label: "葡萄牙文", value: "Portuguese" },
    { label: "俄文", value: "Russian" },
    { label: "阿拉伯文", value: "Arabic" },
    { label: "泰文", value: "Thai" },
    { label: "越南文", value: "Vietnamese" },
    { label: "印尼文", value: "Indonesian" },
    { label: "自动", value: "auto" }
  ],
  sampleRate: [
    { label: "32000 Hz", value: 32000 },
    { label: "44100 Hz", value: 44100 },
    { label: "24000 Hz", value: 24000 },
    { label: "22050 Hz", value: 22050 },
    { label: "16000 Hz", value: 16000 },
    { label: "8000 Hz", value: 8000 }
  ],
  audioFormat: [
    { label: "mp3", value: "mp3" },
    { label: "wav", value: "wav" },
    { label: "flac", value: "flac" },
    { label: "pcm", value: "pcm" },
    { label: "pcmu_raw", value: "pcmu_raw" },
    { label: "pcmu_wav", value: "pcmu_wav" },
    { label: "opus", value: "opus" }
  ],
  channel: [
    { label: "单声道", value: 1 },
    { label: "双声道", value: 2 }
  ],
  bitrate: [
    { label: "32000", value: 32000 },
    { label: "64000", value: 64000 },
    { label: "128000", value: 128000 },
    { label: "256000", value: 256000 }
  ],
  emotion: [
    { label: "自动", value: "" },
    { label: "高兴", value: "happy" },
    { label: "悲伤", value: "sad" },
    { label: "愤怒", value: "angry" },
    { label: "害怕", value: "fearful" },
    { label: "厌恶", value: "disgusted" },
    { label: "惊讶", value: "surprised" },
    { label: "中性", value: "calm" },
    { label: "生动", value: "fluent" },
    { label: "低语", value: "whisper" }
  ],
  soundEffects: [
    { label: "无", value: "" },
    { label: "空旷回音", value: "spacious_echo" },
    { label: "礼堂广播", value: "auditorium_echo" },
    { label: "电话失真", value: "lofi_telephone" },
    { label: "电音", value: "robotic" }
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

function SpeechWorkbench() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [audio, setAudio] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [status, setStatus] = useState("输入文本后开始。");

  const initialValues = useMemo(
    () => ({
      text: "你好，这是一段由 MiniMax Speech 2.8 Turbo 生成的测试音频。愿今天的工作顺利，声音清晰而自然。",
      model: "speech-2.8-turbo",
      voiceId: "Chinese (Mandarin)_Lyrical_Voice",
      customVoiceId: "",
      languageBoost: "Chinese",
      format: "mp3",
      channel: 1,
      speed: 1,
      volume: 1,
      pitch: 0,
      emotion: "",
      englishNormalization: false,
      aigcWatermark: false,
      sampleRate: 32000,
      bitrate: 128000,
      voiceModifyPitch: undefined,
      voiceModifyTimbre: undefined,
      voiceModifyIntensity: undefined,
      soundEffects: "",
      pronunciationTone: ""
    }),
    []
  );

  async function submit(values) {
    const text = values.text?.trim();
    if (!text) {
      message.warning("请输入要合成的文本");
      return;
    }

    setLoading(true);
    setAudio("");
    setMetadata(null);
    setStatus("正在生成音频...");

    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "生成音频失败。");
      }

      setAudio(data.audio);
      setMetadata(data);
      setStatus(`生成完成。模型：${data.model || values.model}`);
      message.success("音频生成完成");
    } catch (error) {
      const text = error instanceof Error ? error.message : "生成音频失败。";
      setStatus(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    React.createElement("section", { className: "speech-workbench" },
      React.createElement(Card, { className: "control-card", bordered: false },
        React.createElement(Form, {
          form,
          layout: "vertical",
          initialValues,
          onFinish: submit,
          requiredMark: false
        },
          React.createElement(Form.Item, {
            label: "文本",
            name: "text",
            rules: [{ required: true, message: "请输入文本" }]
          },
            React.createElement(TextArea, {
              rows: 8,
              placeholder: "输入要合成成语音的文本。",
              showCount: true,
              maxLength: 5000
            })
          ),
          React.createElement("div", { className: "param-grid speech-basic-grid" },
            React.createElement(Form.Item, { label: "模型", name: "model" }, React.createElement(Select, { options: selectOptions.speechModel })),
            React.createElement(Form.Item, { label: "声音", name: "voiceId" }, React.createElement(Select, { options: selectOptions.voice, showSearch: true }))
          ),
          React.createElement(Collapse, {
            ghost: false,
            className: "advanced-panel",
            items: [{
              key: "speech-params",
              label: "高级参数",
              children: React.createElement(React.Fragment, null,
                React.createElement("div", { className: "param-grid" },
                  React.createElement(Form.Item, { label: "自定义音色 ID", name: "customVoiceId" }, React.createElement(Input, { className: "compact-input", placeholder: "填写后优先使用" })),
                  React.createElement(Form.Item, { label: "语言增强", name: "languageBoost" }, React.createElement(Select, { options: selectOptions.languageBoost })),
                  React.createElement(Form.Item, { label: "情绪", name: "emotion" }, React.createElement(Select, { options: selectOptions.emotion })),
                  React.createElement(Form.Item, { label: "格式", name: "format" }, React.createElement(Select, { options: selectOptions.audioFormat })),
                  React.createElement(Form.Item, { label: "采样率", name: "sampleRate" }, React.createElement(Select, { options: selectOptions.sampleRate })),
                  React.createElement(Form.Item, { label: "声道", name: "channel" }, React.createElement(Select, { options: selectOptions.channel })),
                  React.createElement(Form.Item, { label: "码率", name: "bitrate" }, React.createElement(Select, { options: selectOptions.bitrate })),
                  React.createElement(Form.Item, { label: "语速", name: "speed" }, React.createElement(InputNumber, { min: 0.5, max: 2, step: 0.1, className: "full-width" })),
                  React.createElement(Form.Item, { label: "音量", name: "volume" }, React.createElement(InputNumber, { min: 0.1, max: 10, step: 0.1, className: "full-width" })),
                  React.createElement(Form.Item, { label: "音调", name: "pitch" }, React.createElement(InputNumber, { min: -12, max: 12, step: 1, className: "full-width" })),
                  React.createElement(Form.Item, { label: "音高修饰", name: "voiceModifyPitch" }, React.createElement(InputNumber, { min: -100, max: 100, className: "full-width", placeholder: "-100 到 100" })),
                  React.createElement(Form.Item, { label: "音色修饰", name: "voiceModifyTimbre" }, React.createElement(InputNumber, { min: -100, max: 100, className: "full-width", placeholder: "-100 到 100" })),
                  React.createElement(Form.Item, { label: "强度修饰", name: "voiceModifyIntensity" }, React.createElement(InputNumber, { min: -100, max: 100, className: "full-width", placeholder: "-100 到 100" })),
                  React.createElement(Form.Item, { label: "音效", name: "soundEffects" }, React.createElement(Select, { options: selectOptions.soundEffects })),
                  React.createElement(Form.Item, { label: "英文规范化", name: "englishNormalization" }, React.createElement(Segmented, { options: [{ label: "关", value: false }, { label: "开", value: true }] })),
                  React.createElement(Form.Item, { label: "AIGC 水印", name: "aigcWatermark" }, React.createElement(Segmented, { options: [{ label: "关", value: false }, { label: "开", value: true }] }))
                ),
                React.createElement(Form.Item, { label: "发音词典", name: "pronunciationTone" },
                  React.createElement(TextArea, {
                    rows: 3,
                    placeholder: "每行一条，例如：燕少飞/(yan4)(shao3)(fei1)",
                    maxLength: 1000
                  })
                )
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
          }, "生成音频"),
          React.createElement(Text, { className: status.startsWith("正在") ? "status-text" : "status-text muted" }, status)
        )
      ),
      React.createElement(Card, { className: "result-card", bordered: false },
        React.createElement("div", { className: "audio-stage" },
          loading && React.createElement(Spin, { size: "large", tip: "正在生成音频" }),
          !loading && !audio && React.createElement(Empty, {
            image: Empty.PRESENTED_IMAGE_SIMPLE,
            description: "等待生成"
          }),
          audio && React.createElement("div", { className: "audio-result" },
            React.createElement("div", { className: "wave-panel" },
              Array.from({ length: 42 }).map((_, index) =>
                React.createElement("span", {
                  key: index,
                  style: { height: `${18 + ((index * 17) % 58)}%` }
                })
              )
            ),
            React.createElement("audio", { className: "audio-player", controls: true, src: audio }),
            React.createElement("div", { className: "result-toolbar" },
              React.createElement("span", null, metadata?.duration ? `音频长度：${metadata.duration} ms` : metadata?.voiceId || "音频已生成"),
              React.createElement("a", { className: "download-link", href: audio, download: "minimax-speech.mp3" }, "下载音频")
            )
          )
        )
      )
    )
  );
}

function ImageWorkbench() {
  const [form] = Form.useForm();
  const [mode, setMode] = useState("generate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sourcePreview, setSourcePreview] = useState("");
  const [maskPreview, setMaskPreview] = useState("");
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
        await requestEditStream(values);
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
    await readImageStream({
      url: "/api/generate-stream",
      body: JSON.stringify(compactParams(values, false)),
      headers: { "Content-Type": "application/json" },
      expectedCount: Number(values.n || 1),
      modelName: values.model || "gpt-image-2",
      actionText: "生成",
      emptyError: "生成失败。"
    });
  }

  async function readImageStream({ url, body, headers, expectedCount, modelName, actionText, emptyError }) {
    const totalCount = Number(expectedCount || 1);
    let receivedCount = 0;
    let currentModelName = modelName;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body
    });

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      if (data?.code === "MISSING_IMAGE_API_KEY") {
        setSettingsOpen(true);
        setStatus("请先配置 API Key。");
      }
      throw new Error(data.error || emptyError);
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
          currentModelName = event.model || currentModelName;
          setStatus(`开始${actionText}，共 ${event.total} 张...`);
        }

        if (event.type === "image") {
          receivedCount += 1;
          setResult({ model: event.model || currentModelName });
          setImages((previous) => {
            const next = [...previous, event.image];
            setSelectedIndex(next.length - 1);
            return next;
          });
          setStatus(`已${actionText} ${receivedCount} / ${totalCount} 张。模型：${event.model || currentModelName}`);
        }

        if (event.type === "error") {
          throw new Error(event.error || emptyError);
        }
      }
    }

    setStatus(`${actionText}完成，共 ${receivedCount} 张。模型：${currentModelName}`);
  }

  async function requestEditStream(values) {
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

    await readImageStream({
      url: "/api/edit-stream",
      body: formData,
      headers: undefined,
      expectedCount: Number(values.n || 1),
      modelName: values.model || "gpt-image-2",
      actionText: "编辑",
      emptyError: "编辑失败。"
    });
  }

  function beforeUpload() {
    return false;
  }

  function updateUploadPreview(info, setter) {
    const file = info?.fileList?.[0]?.originFileObj;
    if (!file) {
      setter("");
      return;
    }
    setter(URL.createObjectURL(file));
  }

  function clearUpload(fieldName, setter) {
    form.setFieldValue(fieldName, undefined);
    setter("");
  }

  function uploadContent(label, preview, onClear) {
    return preview
      ? React.createElement("div", { className: "upload-preview" },
          React.createElement("img", { className: "upload-preview-image", src: preview, alt: label }),
          React.createElement("button", {
            className: "upload-remove",
            type: "button",
            onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
              onClear();
            },
            "aria-label": `删除${label.replace("添加", "")}`
          }, "×")
        )
      : React.createElement("p", { className: "upload-title" }, label);
  }

  return (
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
                          showUploadList: false,
                          listType: "picture",
                          multiple: false,
                          onChange: (info) => updateUploadPreview(info, setSourcePreview),
                          onRemove: () => setSourcePreview("")
                        },
                          uploadContent("添加原图", sourcePreview, () => clearUpload("image", setSourcePreview)),
                        )
                      ),
                      React.createElement(Form.Item, { label: "蒙版", name: "mask", valuePropName: "file", className: "compact-form-item" },
                        React.createElement(Dragger, {
                          accept: "image/png,image/jpeg,image/webp",
                          beforeUpload,
                          maxCount: 1,
                          showUploadList: false,
                          listType: "picture",
                          multiple: false,
                          onChange: (info) => updateUploadPreview(info, setMaskPreview),
                          onRemove: () => setMaskPreview("")
                        },
                          uploadContent("添加蒙版", maskPreview, () => clearUpload("mask", setMaskPreview))
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
                        React.createElement(Form.Item, { label: "模型", name: "model" }, React.createElement(Select, { options: selectOptions.model })),
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
  );
}

function DreamToolsApp() {
  const [activeTool, setActiveTool] = useState("image");

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
          React.createElement("div", { className: "tool-tabs" },
            React.createElement(Segmented, {
              value: activeTool,
              onChange: setActiveTool,
              options: [
                { label: "图片", value: "image" },
                { label: "语音", value: "speech" }
              ]
            })
          ),
          activeTool === "image" ? React.createElement(ImageWorkbench) : React.createElement(SpeechWorkbench)
        )
      )
    )
  );
}

ReactDOM.createRoot(document.querySelector("#root")).render(React.createElement(DreamToolsApp));
}

boot();
