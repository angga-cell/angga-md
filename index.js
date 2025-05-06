require('./settings');
const fs = require('fs');
const pino = require('pino');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const express = require('express');
const readline = require('readline');
const { createServer } = require('http');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');
const { toBuffer, toDataURL } = require('qrcode');
const { exec, spawn, execSync } = require('child_process');
const { parsePhoneNumber } = require('awesome-phonenumber');
const { default: WAConnection, useMultiFileAuthState, Browsers, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, proto, getAggregateVotesInPollMessage } = require('baileys');

const pairingCode = process.argv.includes('--qr') ? false : process.argv.includes('--pairing-code') || global.pairing_code;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))
let app = express();
let server = createServer(app);
let PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
let pairingStarted = false;

global.fetchApi = async (path = '/', query = {}, options) => {
	const urlnya = (options?.name || options ? ((options?.name || options) in global.APIs ? global.APIs[(options?.name || options)] : (options?.name || options)) : global.APIs['hitori'] ? global.APIs['hitori'] : (options?.name || options)) + path + (query ? '?' + decodeURIComponent(new URLSearchParams(Object.entries({ ...query }))) : '')
	const { data } = await axios.get(urlnya, { ...((options?.name || options) ? {} : { headers: { 'accept': 'application/json', 'x-api-key': global.APIKeys[global.APIs['hitori']]}})})
	return data
}

const DataBase = require('./src/database');
const packageInfo = require('./package.json');
const database = new DataBase(global.tempatDB);
const msgRetryCounterCache = new NodeCache();
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

app.get('/', (req, res) => {
	if (process.send) {
		process.send('uptime');
		process.once('message', (uptime) => {
			res.json({
				bot_name: packageInfo.name,
				version: packageInfo.version,
				author: packageInfo.author,
				description: packageInfo.description,
				uptime: `${Math.floor(uptime)} seconds`
			});
		});
	} else {
		res.json({ error: 'Process not running with IPC' });
	}
});

server.listen(PORT, () => {
	console.log('App listened on port', PORT);
});

const { GroupCacheUpdate, GroupParticipantsUpdate, MessagesUpsert, Solving } = require('./src/message');
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep } = require('./lib/function');

/*
	* Create By Angga Store
	* Follow https://github.com/angga-cell
	* Whatsapp : https://whatsapp.com/channel/0029Val9aN996H4MmCpyzp1b
*/

async function startAnggaBot() {
	const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
	const { state, saveCreds } = await useMultiFileAuthState('Anggadev');
	const { version, isLatest } = await fetchLatestBaileysVersion();
	const level = pino({ level: 'silent' });
	
	try {
		const loadData = await database.read()
		if (loadData && Object.keys(loadData).length === 0) {
			global.db = {
				hit: {},
				set: {},
				users: {},
				game: {},
				groups: {},
				database: {},
				premium: [],
				sewa: [],
				...(loadData || {}),
			}
			await database.write(global.db)
		} else {
			global.db = loadData
		}
		
		setInterval(async () => {
			if (global.db) await database.write(global.db)
		}, 30 * 1000)
	} catch (e) {
		console.log(e)
		process.exit(1)
	}
	
	const getMessage = async (key) => {
		if (store) {
			const msg = await store.loadMessage(key.remoteJid, key.id);
			return msg?.message || ''
		}
		return {
			conversation: 'Halo Saya Angga Bot'
		}
	}
	
	const angga = WAConnection({
		logger: level,
		getMessage,
		syncFullHistory: true,
		maxMsgRetryCount: 15,
		msgRetryCounterCache,
		retryRequestDelayMs: 10,
		connectTimeoutMs: 60000,
		printQRInTerminal: !pairingCode,
		defaultQueryTimeoutMs: undefined,
		browser: Browsers.ubuntu('Chrome'),
		generateHighQualityLinkPreview: true,
		//waWebSocketUrl: 'wss://web.whatsapp.com/ws',
		cachedGroupMetadata: async (jid) => groupCache.get(jid),
		transactionOpts: {
			maxCommitRetries: 10,
			delayBetweenTriesMs: 10,
		},
		appStateMacVerification: {
			patch: true,
			snapshot: true,
		},
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, level),
		},
	})
	
	store.bind(angga.ev)
	
	await Solving(angga, store)
	
	angga.ev.on('creds.update', saveCreds)
	
	angga.ev.on('connection.update', async (update) => {
		const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update
		if ((connection == 'connecting' || !!qr) && pairingCode && !angga.authState.creds.registered && !pairingStarted) {
			pairingStarted = true;
			let phoneNumber;
			async function getPhoneNumber() {
				phoneNumber = global.number_bot ? global.number_bot : await question('Silakan ketik nomor WhatsApp Anda : ');
				phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
				
				if (!parsePhoneNumber(phoneNumber).valid && phoneNumber.length < 6) {
					console.log(chalk.bgBlack(chalk.redBright('Start with your Country WhatsApp code') + chalk.whiteBright(',') + chalk.greenBright(' Example : 62')));
					await getPhoneNumber()
				}
			}
			
			setTimeout(async () => {
				await getPhoneNumber()
				await exec('rm -rf ./anggadev/*')
				console.log('Requesting Pairing Code...')
				await new Promise(resolve => setTimeout(resolve, 5000));
				let code = await angga.requestPairingCode(phoneNumber);
				console.log(`Your Pairing Code : ${code}`);
			}, 3000)
		}
		if (connection == 'close') {
			const reason = new Boom(lastDisconnect?.error)?.output.statusCode
			if (reason === DisconnectReason.connectionLost) {
				console.log('Connection to Server Lost, Attempting to Reconnect...');
				startAnggaBot()
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log('Connection closed, Attempting to Reconnect...');
				startAnggaBot()
			} else if (reason === DisconnectReason.restartRequired) {
				console.log('Restart Required...');
				startAnggaBot()
			} else if (reason === DisconnectReason.timedOut) {
				console.log('Connection Timed Out, Attempting to Reconnect...');
				startAnggaBot()
			} else if (reason === DisconnectReason.badSession) {
				console.log('Delete Session and Scan again...');
				startAnggaBot()
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log('Close current Session first...');
			} else if (reason === DisconnectReason.loggedOut) {
				console.log('Scan again and Run...');
				exec('rm -rf ./anggadev/*')
				process.exit(1)
			} else if (reason === DisconnectReason.forbidden) {
				console.log('Connection Failure, Scan again and Run...');
				exec('rm -rf ./anggadev/*')
				process.exit(1)
			} else if (reason === DisconnectReason.multideviceMismatch) {
				console.log('Scan again...');
				exec('rm -rf ./anggadev/*')
				process.exit(0)
			} else {
				angga.end(`Unknown DisconnectReason : ${reason}|${connection}`)
			}
		}
		if (connection == 'open') {
			console.log('Connected to : ' + JSON.stringify(angga.user, null, 2));
			let botNumber = await angga.decodeJid(angga.user.id);
			if (global.db?.set[botNumber] && !global.db?.set[botNumber]?.join) {
				if (my.ch.length > 0 && my.ch.includes('@newsletter')) {
					if (my.ch) await angga.newsletterMsg(my.ch, { type: 'follow' }).catch(e => {})
					db.set[botNumber].join = true
				}
			}
		}
		if (qr) {
			app.use('/qr', async (req, res) => {
				res.setHeader('content-type', 'image/png')
				res.end(await toBuffer(qr))
			});
		}
		if (isNewLogin) console.log(chalk.green('New device login detected...'))
		if (receivedPendingNotifications == 'true') {
			console.log('Please wait About 1 Minute...')
			angga.ev.flush()
		}
	});
	
	angga.ev.on('contacts.update', (update) => {
		for (let contact of update) {
			let id = angga.decodeJid(contact.id)
			if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
		}
	});
	
	angga.ev.on('call', async (call) => {
		let botNumber = await angga.decodeJid(angga.user.id);
		if (global.db?.set[botNumber]?.anticall) {
			for (let id of call) {
				if (id.status === 'offer') {
					let msg = await angga.sendMessage(id.from, { text: `Saat Ini, Angga Tidak Dapat Menerima Panggilan ${id.isVideo ? 'Video' : 'Suara'}.\nJika @${id.from.split('@')[0]} Memerlukan Bantuan, Silakan Hubungi Owner :)`, mentions: [id.from]});
					await angga.sendContact(id.from, global.owner, msg);
					await angga.rejectCall(id.id, id.from)
				}
			}
		}
	});
	
	angga.ev.on('messages.upsert', async (message) => {
		await MessagesUpsert(angga, message, store, groupCache);
	});
	
	angga.ev.on('groups.update', async (update) => {
		await GroupCacheUpdate(angga, update, store, groupCache);
	});
	
	angga.ev.on('group-participants.update', async (update) => {
		await GroupParticipantsUpdate(angga, update, store, groupCache);
	});

	return angga
}

startAnggaBot()

// Process Exit
process.on('exit', async () => {
	if (global.db) await database.write(global.db)
	console.log('Cleaning up... Closing server.');
	server.close(() => {
		console.log('Server closed successfully.');
	});
});
process.on('SIGINT', async () => {
	if (global.db) await database.write(global.db)
	console.log('Received SIGINT. Closing server...');
	server.close(() => {
		console.log('Server closed. Exiting process.');
		process.exit(0);
	});
});

server.on('error', (error) => {
	if (error.code === 'EADDRINUSE') {
		console.log(`Address localhost:${PORT} in use. Please retry when the port is available!`);
		server.close();
	} else console.error('Server error:', error);
});

setInterval(() => {}, 1000 * 60 * 10);
let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
});
