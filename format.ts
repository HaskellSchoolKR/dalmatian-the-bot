function setDiscordFormat(description: string): string  {
    description = description.split("").map((c) => {
        switch (c) {
            case "*":
            case "~":
            case "|":
            case ">":
            case "`":
                return "\\" + c;
            default:
                return c;
        }
    }).join("").slice(0, 256)

    if (description.length >= 256)
        description = description.concat("...")

    return description
}

export {
    setDiscordFormat,
}