// Your public links and the two founders. Fill these in once; every place on the site that uses them
// (floating WhatsApp button, footer, community section) updates, and anything left empty is simply hidden
// from visitors (in development a small hint shows where it will appear).
//
//   whatsappGroup  the invite link of your WhatsApp group, e.g. https://chat.whatsapp.com/XXXXXXXX
//   telegram       e.g. https://t.me/yourchannel
//   instagram      e.g. https://instagram.com/yourhandle
//   founders       name, and linkedin = the full profile address, e.g. https://www.linkedin.com/in/your-name
export const SITE = {
  whatsappGroup: '',
  telegram: '',
  instagram: '',
  founders: [
    { id: 'iitd', name: '', role: 'Co-founder', college: 'iitd', linkedin: '' },
    { id: 'dtu', name: '', role: 'Co-founder', college: 'dtu', linkedin: '' },
  ],
}

export const COLLEGES = {
  iitd: { short: 'IITD', full: 'IIT Delhi' },
  dtu: { short: 'DTU', full: 'DTU' },
}

// Only real web addresses count as configured.
export const isLink = (value) => /^https?:\/\/\S+$/i.test(value ?? '')
