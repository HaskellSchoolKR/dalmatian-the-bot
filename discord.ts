import { 
    createGlobalApplicationCommand,
    createBot,
    GatewayIntents,
    startBot,
    Intents,
    InteractionTypes,
} from 'https://deno.land/x/discordeno@17.0.0/mod.ts';

import { ApplicationCommandOptionTypes, InteractionResponseTypes } from "https://deno.land/x/discordeno@17.0.0/types/shared.ts";


const bot = createBot({
    token: Deno.env.get("TOKEN")!,
    // botId: 
    // Deno.env.get("APP_ID")
    intents: GatewayIntents.Guilds | Intents.GuildMessages,
    events: {
        ready() {
            console.log("ready");
        },
    },
});

createGlobalApplicationCommand(bot, {
    description: "this is just test",
    name: "test",
    options: [
        {
            description: "test",
            name: "test",
            type: ApplicationCommandOptionTypes.String,
            required: true,
        }
    ]
});

bot.events.interactionCreate = (_, interaction) => {
    if (!interaction.data) return;

    switch (interaction.type) {
        case InteractionTypes.ApplicationCommand:
            console.log(interaction);
            bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                    type: InteractionResponseTypes.ChannelMessageWithSource,
                    data: {
                        content: `🏓 Pong! ${20}ms`,
                    },
                },
            );
            break;
    }
}

await startBot(bot);