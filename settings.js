const fs = require('fs');
const chalk = require('chalk');

/*
	* Create By Angga Store
	* Follow https://github.com/angga-cell
	* Whatsapp : https://whatsapp.com/channel/0029Val9aN996H4MmCpyzp1b
*/

//~~~~~~~~~~~~< GLOBAL SETTINGS >~~~~~~~~~~~~\\

global.owner = ['6287717682382','6283861585742'] //['628','628'] 2 owner
global.packname = 'Bot WhatsApp'
global.author = 'Angga Store'
global.botname = 'Angga-Multi-Device'
global.listprefix = ['+','!','.']
global.listv = ['•','●','■','✿','▲','➩','➢','➣','➤','✦','✧','△','❀','○','□','♤','♡','◇','♧','々','〆']
global.tempatDB = 'database.json' // Taruh url mongodb di sini jika menggunakan mongodb. Format : 'mongodb+srv://...'
global.pairing_code = true
global.number_bot = '' // Kalo pake panel bisa masukin nomer di sini, jika belum ambil session. Format : '628xx'

global.fake = {
	anonim: 'https://telegra.ph/file/95670d63378f7f4210f03.png',
	thumbnailUrl: 'https://telegra.ph/file/fe4843a1261fc414542c4.jpg',
	thumbnail: fs.readFileSync('./src/media/angga.png'),
	docs: fs.readFileSync('./src/media/fake.pdf'),
	listfakedocs: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/pdf'],
}

global.my = {
	yt: 'https://youtube.com/@masaga-o3q?si=IDW6Is6Y0pltCIud',
	gh: 'https://github.com/angga-cell',
	gc: 'https://chat.whatsapp.com/BgFS6wu9jGICBRdFBbExWo',
	ch: 'https://whatsapp.com/channel/0029Val9aN996H4MmCpyzp1b',
	tt: 'https://www.tiktok.com/@kang.geplok2?_t=ZS-8w825apqu7c&_r=1',
	ig: 'https://www.instagram.com/mastani3643?igsh=MWt5MGp4ZXp4OXkzMA==',
	
}

global.limit = {
	free: 5,
	premium: 999,
	vip: 9999
}

global.uang = {
	free: 5000,
	premium: 1000000,
	vip: 10000000
}

global.mess = {
	key: 'Apikey mu telah habis silahkan kunjungi\nhttps://my.angga.pw',
	owner: 'Khusus Angga!!!',
	admin: 'Member gausah so asik',
	botAdmin: 'Bot nya belum jadi admin kak hehe 😄☝️',
	group: 'Gunakan Di Group!',
	private: 'Gunakan Di Privat Chat!',
	limit: 'Limit Anda Telah Habis!',
	prem: 'Khusus VIP User!!',
	wait: '*⏳ Loading...*',
	error: 'Error!',
	done: 'Done'
}

global.APIs = {
	hitori: 'https://api.hitori.pw',
}
global.APIKeys = {
	'https://api.hitori.pw': 'htrkey-77eb83c0eeb39d40',
	geminiApikey: ['AIzaSyD0lkGz6ZhKi_MHSSmJcCX3wXoDZhELPaQ','AIzaSyDnBPd_EhBfr73NssnThVQZYiKZVhGZewU','AIzaSyA94OZD-0V4quRbzPb2j75AuzSblPHE75M','AIzaSyB5aTYbUg2VQ0oXr5hdJPN8AyLJcmM84-A','AIzaSyB1xYZ2YImnBdi2Bh-If_8lj6rvSkabqlA']
}

// Lainnya

global.badWords = ['tolol','goblok','asu','pantek','kampret','ngentot','jancok','kontol','memek','lonte', 'anjing', 'anj', 'mmk', 'kntl', 'gblk', 'puqi']


//~~~~~~~~~~~~~~~< PROCESS >~~~~~~~~~~~~~~~\\

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
});