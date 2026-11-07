// Public links, the founders and the exam date. Anything left empty is simply hidden from visitors.
//
//   whatsappGroup  the invite link of your WhatsApp group, e.g. https://chat.whatsapp.com/XXXXXXXX
//   telegram       e.g. https://t.me/yourchannel
//   instagram      e.g. https://instagram.com/yourhandle
//   exam           the next JEE date as YYYY-MM-DD. Once set, the home page shows a "days to go" counter.
//                  Leave it empty until the official date is announced.
export const SITE = {
  whatsappGroup: '',
  telegram: '',
  instagram: '',
  exam: { name: 'JEE Main', date: '' },
  // photo: put the image in public/founders/ (square, at least 300x300). Until the file exists the card
  // shows the initials instead.
  founders: [
    { id: 'bhoomi', name: 'Bhoomi Deswal', role: 'Founder', college: 'iitd', photo: '/founders/bhoomi.jpg', linkedin: 'https://www.linkedin.com/in/bhoomideswal/' },
    { id: 'dhruv', name: 'Dhruv Bansal', role: 'Founder', college: 'dtu', photo: '/founders/dhruv.jpg', linkedin: 'https://www.linkedin.com/in/dhruv-bansal07/' },
  ],
}

export const COLLEGES = {
  iitd: { short: 'IITD', full: 'Indian Institute of Technology Delhi', tone: 'bg-ember-500 text-white' },
  dtu: { short: 'DTU', full: 'Delhi Technological University', tone: 'bg-sage-600 text-white dark:bg-sage-500 dark:text-ivory-50' },
}

// Only real web addresses count as configured.
export const isLink = (value) => /^https?:\/\/\S+$/i.test(value ?? '')
