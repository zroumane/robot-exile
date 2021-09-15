const { client, db } = require("../index.js");
const { MessageAttachment } = require("discord.js");
const Canvas = require("canvas");

Canvas.registerFont("./assets/tommy.otf", { family: "Tommy" });

module.exports = {
  execute: async (member) => {
    if (!db.exists("/welcome/channel")) return;
    const channel = client.guild.channels.cache.get(db.getData("/welcome/channel"));
    if (!channel) return;

    const canvas = Canvas.createCanvas(1202, 670);
    const context = canvas.getContext("2d");

    const background = await Canvas.loadImage("./assets/banner.jpg");
    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.font = "bold 80px Tommy";
    context.fillText("Bienvenue", canvas.width / 2, canvas.height / 2 + 70);

    const displayName = `${member.nickname ?? member.user.username}#${member.user.discriminator}`;
    let fontSize = "140";
    do {
      context.font = `bold ${(fontSize -= 5)}px Tommy`;
    } while (context.measureText(displayName).width > canvas.width - 150);
    context.fillText(displayName, canvas.width / 2, canvas.height / 2 + 200);

    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2 - 160, 140, 0, Math.PI * 2, true);
    context.closePath();
    context.clip();

    const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ format: "png" }));
    context.drawImage(avatar, canvas.width / 2 - 140, canvas.height / 2 - 300, 280, 280);

    const attachment = new MessageAttachment(canvas.toBuffer());
    let body = { files: [attachment] };
    if (db.exists("/welcome/add")) body.content = db.getData("/welcome/add").replace("%u", `<@${member.id}>`);
    channel.send(body);
  },
};
