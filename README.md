# Google Enterprise Ticketing MVP

这是一个给政府部门售后技术支持使用的票务系统示例项目。

目前这套系统已经改成：

- 普通用户不用登录
- 普通用户可以直接提交问题
- 普通用户可以用 `ticket ID + email` 查询自己的 ticket
- 管理员可以登录后台处理 ticket
- 数据已经接到本机 MongoDB
- 用户上传的图片和录屏会先加密，再存进 MongoDB 的 GridFS

## 1. 这套系统能做什么

### 用户端

- 不登录直接提交 ticket
- 提交文字说明
- 上传截图
  - 只允许 `jpg / jpeg / png`
  - 单文件不超过 `5MB`
- 上传录屏
  - 只允许 `mp4 / webm`
  - 单文件不超过 `20MB`
  - 时长不超过 `60 秒`
- 提交成功后自动进入自己的 ticket 页面
- 后续可以用 `ticket ID + email` 查进度
- 如果管理员已经回复，用户可以继续补充信息
- 如果管理员已经回复但仍未解决，可以跳转 `wa.me`

### 管理员端

- 查看全部 ticket
- 按优先级、状态、部门筛选
- 回复用户
- 上传附件
- 调整 ticket 状态
- 调整优先级
  - 调整时必须填写原因
  - 会记录历史
- 封存已解决 ticket
- 导出报表
  - CSV
  - PDF

## 2. 你电脑上需要先有这些东西

### 必须安装

- Node.js
  - 建议 `20` 或以上
- MongoDB
  - 你现在已经装好了

### 这台机器当前默认配置

你的 MongoDB 现在按这个地址连接：

```text
mongodb://127.0.0.1:27017
```

这个项目默认会使用这个数据库：

```text
ticketing_system
```

如果你没有改过 MongoDB 的密码、端口、账号，那就不用额外设置，直接可以用。

## 3. 第一次使用怎么启动

在项目根目录打开终端，运行：

```bash
npm install
```

然后初始化 MongoDB：

```bash
npm run init:mongodb
```

再启动系统：

```bash
npm start
```

启动后打开浏览器访问：

```text
http://localhost:3000
```

## 4. 管理员登录账号

当前内建的演示管理员账号：

- Email: `admin@gov-support.local`
- Password: `Admin123!`

## 5. MongoDB 会自动创建什么

这个项目已经写好了初始化脚本。

你运行下面这条命令时：

```bash
npm run init:mongodb
```

系统会自动在 MongoDB 里创建数据库和集合。

### 自动创建的数据库

```text
ticketing_system
```

### 自动创建的集合

- `users`
  - 存用户资料
  - 包括公开提交用户和管理员
- `tickets`
  - 存 ticket 主资料
- `settings`
  - 存系统设置
  - 比如 WhatsApp 号码、关键字规则、SLA
- `notifications`
  - 存通知队列
- `auditLogs`
  - 存操作日志
- `sessions`
  - 存 session
- `otpCodes`
  - 预留 OTP 相关资料
- `attachments.files`
  - GridFS 的文件主表
- `attachments.chunks`
  - GridFS 的文件分块表

## 6. 现在 MongoDB 里已经有数据了吗

有。

我已经帮你初始化过了，而且也跑过测试数据，所以现在库里不是空的。

如果你只是想确认“表有没有建好”，答案是：

- 有，已经建好
- 而且里面已经有测试数据

## 7. 如果你想清空测试数据怎么办

### 方法 1：直接删除整个数据库

如果你会用 MongoDB Compass：

1. 打开 MongoDB Compass
2. 连接 `mongodb://127.0.0.1:27017`
3. 找到数据库 `ticketing_system`
4. 删除整个数据库
5. 回到项目重新运行：

```bash
npm run init:mongodb
```

这样会重新建立结构

### 方法 2：只删数据，不删结构

如果你之后要，我也可以直接帮你再写一个：

- `npm run reset:mongodb`

让你一条命令清空测试数据并重建默认结构。

## 8. 如何查看 MongoDB 里的数据

### 推荐方式：MongoDB Compass

如果你是新手，最简单的是装 MongoDB Compass。

连接地址填：

```text
mongodb://127.0.0.1:27017
```

连接后你会看到：

- 数据库：`ticketing_system`
- 集合：`users`、`tickets`、`settings` 等

其中：

- 用户资料看 `users`
- 工单资料看 `tickets`
- 附件不要在普通集合里找
  - 附件在 GridFS
  - 也就是 `attachments.files` 和 `attachments.chunks`

## 9. 项目常用命令

### 安装依赖

```bash
npm install
```

### 初始化 MongoDB

```bash
npm run init:mongodb
```

### 启动项目

```bash
npm start
```

### 开发模式启动

```bash
npm run dev
```

## 10. 目录说明

### 重要文件

- [package.json](C:/Users/mier3/OneDrive/Desktop/Google%20gemini%20ticketsystem/package.json)
  - 项目依赖和命令
- [src/server.js](C:/Users/mier3/OneDrive/Desktop/Google%20gemini%20ticketsystem/src/server.js)
  - 后端主服务
- [src/mongo.js](C:/Users/mier3/OneDrive/Desktop/Google%20gemini%20ticketsystem/src/mongo.js)
  - MongoDB 连接和集合初始化
- [src/store.js](C:/Users/mier3/OneDrive/Desktop/Google%20gemini%20ticketsystem/src/store.js)
  - 数据读写和默认种子数据
- [src/security.js](C:/Users/mier3/OneDrive/Desktop/Google%20gemini%20ticketsystem/src/security.js)
  - 附件加密和解密
- [public/app.js](C:/Users/mier3/OneDrive/Desktop/Google%20gemini%20ticketsystem/public/app.js)
  - 前端逻辑
- [public/styles.css](C:/Users/mier3/OneDrive/Desktop/Google%20gemini%20ticketsystem/public/styles.css)
  - 前端样式
- [scripts/init-mongodb.js](C:/Users/mier3/OneDrive/Desktop/Google%20gemini%20ticketsystem/scripts/init-mongodb.js)
  - MongoDB 初始化脚本

## 11. 环境变量

这套项目不是必须设置环境变量，也能直接运行。

如果要改，可以设置：

- `PORT`
  - 默认是 `3000`
- `MONGODB_URI`
  - 默认是 `mongodb://127.0.0.1:27017`
- `MONGODB_DB_NAME`
  - 默认是 `ticketing_system`
- `APP_ENCRYPTION_KEY`
  - 附件加密 key
  - 需要是 `64 位十六进制字符串`
  - 如果你不设置，系统会用内建演示 key

### 示例

PowerShell 里可以这样运行：

```powershell
$env:PORT="3000"
$env:MONGODB_URI="mongodb://127.0.0.1:27017"
$env:MONGODB_DB_NAME="ticketing_system"
npm start
```

## 12. 新手最常见问题

### 为什么我没手动建表，MongoDB 里还是有表

因为这个项目已经帮你自动建好了。

你只需要运行：

```bash
npm run init:mongodb
```

系统就会自动创建数据库、集合和索引。

### 为什么附件会出现在 `attachments.files` 和 `attachments.chunks`

因为我用的是 MongoDB 的 GridFS。

这是比“把大文件直接塞进普通文档”更适合上传文件的方式。

而且本项目会先对附件加密，再存进去。

### 为什么普通用户不需要登录，但还能看自己的 ticket

因为系统现在改成了：

- 提交时直接建立公开用户记录
- 返回一个临时 session
- 后续也能用 `ticket ID + email` 重新取回自己的 ticket 页面

### 如果将来你要正式上线，建议怎么做

建议后续再升级这几项：

- 给公开查询加验证码或 email 验证
- 接入真实 SMTP 发信
- 接入 WhatsApp Business API
- 管理员改成正式账号体系
- 补充防刷和限流
- 把测试数据清理掉

## 13. 当前限制

- 现在的 WhatsApp / Email 还是占位逻辑，还没有接真实网关
- 普通用户查 ticket 目前依赖 `ticket ID + email`
- 现在已经有测试数据在 MongoDB 里

## 14. 一句话快速开始

如果你只想最快跑起来，就执行这三步：

```bash
npm install
npm run init:mongodb
npm start
```

然后打开：

```text
http://localhost:3000
```
