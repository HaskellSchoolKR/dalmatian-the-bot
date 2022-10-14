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
    intents: GatewayIntents.Guilds | Intents.GuildMessages,
    events: {
        ready() {
            console.log("ready");
        },
    },
});

createGlobalApplicationCommand(bot, {
    description: "search for hoogle",
    name: "hoogle",
    options: [
        {
            description: "typing your searching content",
            name: "name",
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
                        embeds: [{
                            title: "name",
                            description: "typing content",
                            color: 15576321,
                            author: {
                                name: "hoogle"
                            }
                        }],
                    },
                },
            );
            break;
    }
}

await startBot(bot);