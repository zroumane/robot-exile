import { MessageAttachment } from "discord.js";
import { checkChannel, client, db, guild } from "./index.js";
import Canvas from "canvas";

Canvas.registerFont("./assets/tommy.otf", { family: "Tommy" });

let welcome = db.getData("/channel/welcome");
let role = db.getData("/channel/role");

let channel = guild.channels.cache.get(welcome);

const messages = {
  add: "Salut <@%u>, bienvenue sur le discord des exilés prend contact avec un membre du staff et il se fera un plaisir de t'accueillir comme il se doit sur notre beau discord, pour avoir accès à l'ensemble du discord, choisi un rôle ici : <#%r>",
  delete: "<@%u> un ami fromager nous quitte! Bon vent à toi!",
};

client.on("guildMemberRemove", (member) => {
  channel.send(messages.delete.replace("%u", member.id));
});

client.on("guildMemberAdd", async (member) => {
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
  channel.send({ content: messages.add.replace("%u", member.id).replace("%r", role), files: [attachment] });
});
