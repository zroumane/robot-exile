const { db } = require('../index.js')
const refreshCommand = require('../utils/refreshCommand.js')
const removeFromArray = require('../utils/removeFromArray.js')

const messages = {
  channel: "Vous devez fournir un salon de type texte.",
  role: "Vous devez fournir un role valide.",
  update: "Les données ont été mise à jour.",
  streamerList: "Voici la liste des streamers :\n",
  noStreamer: "Il n'y a pas de streamer enregistré.",
  notFound: "L'utilisateur est introuvable.",
  removed: "L'utilisateur à été désenregistré.",
  added: "L'utilisateur %u à été enregistré."
}


// Handlers 
const fetchStreamers = () => {
  // Fetch role id and return if not set      
  const twitch = db.get('/twitch');

  // if (!twitch.role.streamer || !twitch.role.live || !twitch.channel) return

  // // Fetch streamer role members
  // const streamers = await client.guild.roles.resolve(streamerRole).members;

  // streamers.forEach(streamer => {
  //   const activity = streamer.presence.activities.find(a => a.type == "STREAMING")

  //   if (activity) {
  //     if (twitch.lives.includes(streamer.id)) return
  //     else {
  //       db.push('/twitch/lives[]', streamer.id)
  //       const channel = await client.guild.channel.resolve(twitch.channel)
  //       const message = twitch.message.replace('%u', activity.url)
  //       channel.send(message)
  //     }
  //   }
  // })
}

// Handler call evenry 2 minutes 
setInterval(fetchStreamers, 60 * 1000 * 2)

const getData = () => {
  return {
    name: "twich",
    description: "Commandes twitch",
    defaultPermission: false,
    options: [
      {
        name: "add",
        description: "Ajouter un streamer",
        type: 1,
        options: [
          {
            name: "user",
            description: "Membre à ajouter",
            required: "true",
            type: "USER"
          }
        ]
      },
      {
        name: "remove",
        description: "Supprimer un streamer",
        type: 1,
        options: [
          {
            name: "user",
            description: "Membre à supprimer",
            required: "true",
            type: "USER",
            choices: db.getData('/twitch/streamers').map(s => {
              return {
                name: s.id,
                value: s.id
              }
            })
          }
        ]
      },
      {
        name: "list",
        description: "Voir la liste des streamers",
        type: 1,
      },
      {
        name: "config",
        description: "Configurer l'annonce des streams",
        type: 1,
        options: [
          {
            name: "channel",
            description: "Salon où afficher les streamers",
            required: false,
            type: "CHANNEL"
          },
          {
            name: "role",
            description: "Role \"en live\"",
            required: false,
            type: "ROLE"
          }
        ]
      }
    ]
  }
}


module.exports = {
  data: getData(),
  execute: async (interaction, args) => {
    if(args.get('subcommand') == "list"){
      const streamers = db.getData('/twicth/streamers')
      return interaction.editReply(
        streamers.lenght == 0 
        ? messages.noStreamer
        : messages.streamerList + streamers.map(s => `<@${s.id}>`).join('\n')
      )
    }

    if(args.get('subcommand') == "add"){
      const member = await client.guild.members.resolve(args.get('user'))
      if(!member) return interaction.editReply(messages.notFound)
      interaction.editReply(messages.added.replace('%u', `<@${member.id}>`))
    }

    if(args.get('subcommand') == "remove"){
      const result = await removeFromArray('/twitch/streamers', args.get('user'), 'id')
      if(!result) return interaction.editReply(messages.notFound)
      interaction.editReply(messages.removed)
    }
    
    if(args.get('subcommand') == "config"){

      if(args.get('channel')){
        const channel = await client.guild.channels.resolve(args.get('channel'))
        if(!channel || channel?.type != "GUILD_TEXT") return interaction.editReply(message.channel)
        db.push('/twitch/channel', channel.id)
      }

      if(args.get('role')){
        const role = await client.guild.roles.resolve(args.get(role))
        if(!role) return interaction.editReply(message.role)
        db.push(`/twitch/role`, channel.id)
      }
  
      interaction.editReply(message.update)      
    }
    
    return refreshCommand(interaction.command, getData())
  }
}


