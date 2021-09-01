import { Message } from "discord.js";
import { db, guild, ownerChannel } from "./index.js";
import Twitter from "twitter-v2";

const messages = {
  noaAcount: "Il n'y a pas de compte enregistré",
  accountListe: "Voici la liste des comptes enregistrées :\n",
};

var T = new Twitter({
  consumer_key: process.env.CONSUMER,
  consumer_secret: process.env.CONSUMER_SECRET,
});

var stream = null;

const listenForever = async (getStream, cb, atempt) => {
  try {
    for await (const { data } of getStream()) cb(data);
  } catch (error) {
    ownerChannel.send("Error" + error);
    return setTimeout(() => {
      console.log(atempt);
      listenForever(getStream, cb, atempt + 1);
    }, 2 ** atempt * 1000);
  }
};

const reloadStream = async () => {
  var twitter = db.getData("/twitter");
  if (twitter.length == 0) return;
  if (stream) stream.close();

  const res = await T.get("tweets/search/stream/rules");
  if (res.data && res.data.length > 0) {
    await T.post("tweets/search/stream/rules", {
      delete: { ids: res.data.map((r) => r.id) },
    });
  }
  await T.post("tweets/search/stream/rules", {
    add: twitter.map((u) => {
      return { value: `from:${u.name}`, tag: `from ${u.name}` };
    }),
  });

  listenForever(
    () => {
      stream = T.stream("tweets/search/stream", {
        "tweet.fields": ["author_id"],
      });
      return stream;
    },
    (data) => {
      let user = twitter.find((u) => u.id == data.author_id);
      if (user) {
        let channel = guild.channels.cache.get(user.channel);
        if (channel) channel.send(`https://twitter.com/${user.name}/status/${data.id}`);
      }
    },
    1
  );
};

reloadStream();

/**
 * @param {Message} msg
 */
export const twitter = async (msg) => {
  let name = msg.content.split(" ")[1];
  const twitter = db.getData("/twitter");

  if (!name) {
    let str = twitter.map((u) => `@${u.name} dans le salon <#${u.channel}>`);
    return msg.reply(str.length == 0 ? messages.noaAcount : messages.accountListe + str.join("\n"));
  }

  if (name.startsWith("-")) {
    db.push(
      "/twitter",
      twitter.filter((u) => u.name != name.slice(1))
    );
    return msg.react("✅");
  }

  try {
    let user = (await T.get("users/by/username/" + name)).data;
    let obj = { channel: msg.channel.id, id: user.id, name: user.username };
    let data = twitter.filter((u) => u.id != user.id);
    data.push(obj);
    db.push(`/twitter/`, data);
    reloadStream();
    msg.react("✅");
  } catch (e) {
    console.log(e);
    msg.react("❌");
  }
};
