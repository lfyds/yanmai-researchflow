研脉 ResearchFlow - CloudBase 云托管 Git 部署包

本包用于 Git 仓库部署，不是静态网站托管 ZIP 上传包。
包含 Dockerfile，容器默认监听 3000 端口。

云托管配置：
- 服务名称：yanmai-api
- 服务端口：3000
- 构建目标目录：./
- Dockerfile：有
- Dockerfile 名称：Dockerfile
- 环境变量：DEEPSEEK_API_KEY = 你的 DeepSeek 平台 API Key
- API Key 设置开关：关闭
- 启动命令由 Dockerfile 的 CMD 执行（npm start）

重要说明：
1. 请将本压缩包解压后，把其中所有文件上传到一个 GitHub 仓库根目录，再授权 CloudBase 选择该仓库和分支。
2. 前端当前仍请求相对路径 /api/chat。云托管服务部署后会分配独立访问域名，需要把前端 API 地址改为该域名，再重新部署静态网站；在完成这一步前，AI 问答和翻译仍可能不可用。
3. 本包的后端加入了基础 CORS 响应头，正式公开前仍应进一步限制允许的前端来源并做安全测试。
4. 不要把 API Key 写入源码、GitHub 仓库或聊天截图；只放在 CloudBase 环境变量中。
5. 论文上传及用户资料的存储、安全、隐私机制仍需上线前检查。
