const { Client, Intents } = require('discord.js');
require('dotenv').config();
const axios = require('axios');

const botId = process.env.BOT_USER_ID

const staff = process.env.STAFF_USER_IDS.split(" ")

const intents = new Intents()
intents.add(Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.DIRECT_MESSAGES)

const server = axios.create({
    baseURL: process.env.AVABOT_SERVER,
    headers:{
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: "Bearer "+process.env.BOT_API_KEY
    }
})

let bot = new Client({ intents: intents, partials: ['CHANNEL', 'MESSAGE'] });

bot.login(process.env.BOT_TOKEN);

bot.on('ready', async function(){
    console.log("Ava monitor is online");
})

bot.on('presenceUpdate', async (oldPresence, newPresence) => {
    if(newPresence.userId === botId || (oldPresence && oldPresence.userId === botId)) {
        let msg = ""
        if(newPresence.status === "offline"){
            msg = "❌ WARNING: Ava has disconnected from Discord!\nI am able to wake her up again. Respond with 'reboot' or 'restart' for me to do this"
        } else if (!oldPresence && newPresence.userId === botId) {
            msg = "✅ Ava has reconnected to Discord."
        }

        if(msg !== "") {
            for (const member of staff) {
                let user = await bot.users.fetch(member)
                user.send(msg)
            }
        }
    }
})

bot.on('messageCreate', async message => {
    if(message.author.bot) return;

    if (message.channel.type === 'DM') {
        if(staff.includes(message.author.id)) {
            const resources = await server.get("/resources")

            if(["reboot", "restart"].includes(message.content.toLowerCase())) {

                if(resources.data.attributes.current_state === "offline") {
                    const response = await server.post('/power', {'signal': 'start'})

                    if(response.status == "204") {
                        message.channel.send("I have initiated Ava's morning routine. She will be up shortly.")
                    } else {
                        message.channel.send("I was unable to restart Ava. Please investigate manually.")
                    }
                } else {
                    message.channel.send("Ava is already running or starting.")
                }

            } else if (message.content.toLowerCase() === "status") {
                message.channel.send(`Ava is currently ${resources.data.attributes.current_state}, and has been up for: ${parseInt((resources.data.attributes.resources.uptime/60000)%60)} minutes`)
            }
        }
    }
})