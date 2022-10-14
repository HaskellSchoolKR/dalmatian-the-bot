import {
    createGlobalApplicationCommand,
    createBot,
    GatewayIntents,
    startBot,
    Intents,
    InteractionTypes,
} from 'https://deno.land/x/discordeno@17.0.0/mod.ts';
import { ApplicationCommandOptionTypes, InteractionResponseTypes } from "https://deno.land/x/discordeno@17.0.0/types/shared.ts";
import { search } from './hoogle.ts';

const bot = createBot({
    token: Deno.env.get("TOKEN")!,
    intents: GatewayIntents.Guilds | Intents.GuildMessages,
});

await createGlobalApplicationCommand(bot, {
    description: "search in hoogle",
    name: "hoogle",
    options: [
        {
            description: "search for ...",
            name: "query",
            type: ApplicationCommandOptionTypes.String,
            required: true,
        }
    ]
});

bot.events.interactionCreate = async (_, interaction) => {
    if (interaction.type !== InteractionTypes.ApplicationCommand) return;

    //@ts-ignore
    const result = await search(interaction.data?.options[0].value as string)[0]

    bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: {
              embeds: [{
                  title: `${result.package.name}/${result.module.name} - ${result.item}`,
                  description: result.docs,
                  color: 15576321,
                  author: {
                      name: result.item
                  },
                  url: result.url
              }],
          },
      },
    );
}

await startBot(bot);