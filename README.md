# <p align="center">🤖 BotWA - WhatsApp Bot</p>

<p align="center">
  <img src="https://img.shields.io/badge/Made_With-TypeScript-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Powered_by-Baileys-purple?style=for-the-badge&logo=whatsapp" alt="Baileys">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
</p>

<p align="center">
  A powerful and extensible WhatsApp bot built with TypeScript and the Baileys library. This bot allows you to automate interactions on WhatsApp with a modular command system and plugin architecture. Fully compatible with Node.js runtime</p>

## ✨ Features

- 🔧 **Modular Command System**: Easy to add and manage commands through a plugin system
- 📱 **Multi-device Support**: Works with WhatsApp's multi-device protocol (Baileys v7)
- 🗄️ **Persistent Storage**: Robust SQLite database (`better-sqlite3`) to prevent memory leaks
- 🛡️ **Anti-Spam Security**: Built-in rate limiter to prevent bot abuse
- 🔌 **Connection Stability**: Exponential backoff for reconnections & Graceful Shutdown logic
- 👥 **Group Management**: Welcome messages and group participation tracking
- 🔐 **Permission System**: Owner-only, group-only, and private chat commands
- 💬 **UX Enhancements**: Auto-read (blue ticks) and typing indicators for natural interaction
- 🔄 **File Watching**: Automatically reloads commands when plugin files are modified

## 🧰 Prerequisites

- 🟢 **Node.js** (v18 or higher)
- 📦 **npm** or yarn package manager
- 📱 **WhatsApp** account with a verified phone number

## 🚀 Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd botwa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## ⚙️ Configuration

1. Create a `.env` file in the root directory (if not already present) and set the following variables:

   ```
   OWNER=628xxxxxxxxxx  # Your phone number in international format
   isSelf=true          # Set to true to enable self-mode (only respond to owner)
   ```

2. Make sure to replace `OWNER` with your actual phone number in international format without the `+` sign.

## 🎯 Usage

### For Development:

```bash
npm run dev
```

### For Production:

1. Build the project:
   ```bash
   npm run build
   ```
2. Start the bot:

   ```bash
   npm start
   ```

3. On first run, the bot will prompt you to enter your phone number and provide a pairing code. Follow the instructions to connect your WhatsApp account.

4. The bot will generate authentication credentials in the `baileys_auth_info/` directory. These files will be used for subsequent logins.

## 🛠️ Commands

The bot uses a command system with the following syntax:

- Commands start with `!`, `/`, or `.`
- Example: `!menu`, `/help`, `.list`

### Available Commands

- 📋 **Menu Command**: Displays all available commands
  - Usage: `!menu`, `!help`, or `!list`
  - Shows commands organized by category with descriptions and usage information

- 🔍 **Category-specific Menu**: Display commands for a specific category
  - Usage: `!menu [category]`
  - Example: `!menu info`

### Adding Custom Commands

The bot supports a plugin system for adding custom commands:

1. Create a new TypeScript file in the `src/plugins/` directory
2. Use the command registration system:

   ```typescript
   import cmd, { type CommandContext } from "../commands/map";

   cmd.add({
     name: "hello",
     alias: ["hi", "greeting"],
     category: ["general"],
     desc: "Sends a greeting message",
     async run({ m }: CommandContext) {
       m.reply("Hello! How are you?");
     },
   });
   ```

3. The bot automatically detects and loads new commands when the file is saved (thanks to the file watcher).

### Running Code Without Commands (Using Middleware)

The bot also supports middleware functionality that allows you to execute code for every message received, regardless of whether it's a command or not. This is particularly useful for:

- Auto-replying to specific keywords or phrases
- Logging all messages
- Tracking user activity
- Implementing automatic responses based on content

To use middleware functionality:

1. Create a new file in the `src/plugins/` directory (e.g., `auto-reply.ts`)
2. Use the `middleware` property instead of the `run` property:

   ```typescript
   import cmd, { type CommandContext } from "../commands/map";

   cmd.add({
     middleware: async ({ m, sock }: CommandContext) => {
       const messageText = m.body.toLowerCase();

       if (messageText.includes("hello")) {
         m.reply("Hi there! I received your message.");
       }

       console.log(`Received message: ${m.body} from ${m.sender}`);
     },
   });
   ```

3. The middleware function will execute for every incoming message, whether it's a command or not
4. Unlike the `run` property which only executes when the command is specifically called, `middleware` runs on every message
5. Remember that middleware runs frequently, so optimize your code for performance

## 🔒 Permissions System

Commands can have different permission levels:

- 👑 **Owner-only**: Only the number specified in `OWNER` environment variable can use
- 👥 **Group-only**: Only works in group chats
- 💬 **Private-only**: Only works in private messages
- 🤖 **Self-only**: Only responds to messages from the bot itself

## 📁 Project Structure

```
botwa/
├── index.ts              # Main entry point & Connection handler
├── .env                  # Environment variables
├── .gitignore
├── package.json
├── README.md
├── tsconfig.json         # TypeScript configuration
├── data/                 # SQLite database folder (`bot.db`)
├── baileys_auth_info/    # Authentication credentials
├── node_modules/
├── dist/                 # Compiled JavaScript files (after build)
└── src/
    ├── types.ts          # Shared TypeScript interfaces
    ├── commands/
    │   ├── handler.ts    # Command processing logic & Rate-Limiter
    │   ├── map.ts        # Command registry interface
    │   └── register.ts   # Command loading and watching
    ├── events/
    │   ├── groups.ts     # Group event handlers
    │   └── messages.ts   # Message event handlers (with UX logic)
    ├── plugins/          # Command plugins (.ts files)
    └── utils/
        ├── db.ts         # SQLite Database Wrapper
        ├── fmt.ts        # Message formatting utilities
        ├── msg.ts        # Message processing utilities
        └── socket.ts     # WASocket initialization
```

## 🌐 Environment Variables

- `OWNER`: WhatsApp number in international format (without +) of the bot owner
- `isSelf`: When set to `true`, bot only responds to owner's commands

## 🧑‍💻 Development

To contribute or modify the bot:

1. Make changes to the source code in the `src/` directory
2. For development, use `npm run dev` to run with automatic reloading
3. For plugin changes, the bot automatically reloads when you save
4. For core changes, restart the bot to see the changes

## 🏗️ Building for Production

To compile the TypeScript code to JavaScript:

```bash
npm run build
```

This will create a `dist/` directory with the compiled JavaScript files.

## 📚 Common Commands in the Bot

The bot comes with a default command system. Use `!menu`, `!help`, or `!list` to see all available commands once the bot is running.

## 🐛 Troubleshooting

- If you get authentication errors, delete the `baileys_auth_info/` directory and restart the bot to re-authenticate
- Make sure your phone number is in international format in the `.env` file
- Check that the bot has proper permissions for the actions you're trying to perform
- For development, use `npm run dev` for easier debugging

## 🤝 Community & Support

<p>Join our WhatsApp group for discussions, support, and updates:</p>

[![WhatsApp Group](https://img.shields.io/badge/Join_Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/LIxeP0zjxkwIq8uMhiEFbD?mode=wwt)

<p>Stay updated with other projects by following our WhatsApp channel:</p>

[![WhatsApp Channel](https://img.shields.io/badge/Subscribe_Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029VbBnJebLCoWt2piXYb34)

## 🖥️ Hosting Your Bot

<p>Looking for reliable hosting for your WhatsApp bot? Check out <strong>pwcraft cloud</strong> for affordable and stable VPS solutions perfect for running your bot 24/7:</p>

[![pwcraft cloud](https://img.shields.io/badge/pwcraft_cloud-00C4FF?style=for-the-badge&logo=google-cloud&logoColor=white)](https://whatsapp.com/channel/0029Vb6WymkAe5VwnfNMIq0H)

## 📄 License

This project is open source and available under the MIT License.
