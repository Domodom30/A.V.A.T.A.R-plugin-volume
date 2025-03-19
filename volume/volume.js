import * as path from 'node:path';
import fs from 'fs-extra';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import AudioController from './lib/audioController.js';
const audio = new AudioController();

import * as widgetLib from '../../../widgetLibrairy.js';
const Widget = await widgetLib.init();

// devices table
let periphInfo = [];
//language pak
let Locale;
let volumeWindow;
let currentwidgetState;

const widgetFolder = path.resolve(__dirname, 'assets/widget');
const widgetImgFolder = path.resolve(__dirname, 'assets/images/widget');

export async function onClose(widgets) {
  // Save widget positions
  if (Config.modules.volume.widget.display === true) {
    await Widget.initVar(widgetFolder, widgetImgFolder, null, Config.modules.volume);
    if (widgets) await Widget.saveWidgets(widgets);
  }
}

export async function init() {
  if (!(await Avatar.lang.addPluginPak('volume'))) {
    return error('volume: unable to load language pak files');
  }

  Locale = await Avatar.lang.getPak('volume', Config.language);
  if (!Locale) {
    return error(`volume: Unable to find the '${Config.language}' language pak.`);
  }

  periphInfo.push({
    Buttons: [
      {
        name: 'Settings',
        value_type: 'button',
        usage_name: 'Button',
        periph_id: '121212',
        notes: 'Settings Volume',
      },
    ],
  });
  return periphInfo;
}

export async function getWidgetsOnLoad() {
  if (Config.modules.volume.widget.display === true) {
    await Widget.initVar(widgetFolder, widgetImgFolder, null, Config.modules.volume);
    let widgets = await Widget.getWidgets();
    return { plugin: 'volume', widgets: widgets, Config: Config.modules.volume };
  }
}

export async function getNewButtonState(arg) {
  return currentwidgetState === true ? 'On' : 'Off';
}

export async function getPeriphInfo() {
  return periphInfo;
}

export async function widgetAction(even) {
  if (even.type !== 'button') {
    // Action for 'List of values' and 'float value' types
    await Widget.initVar(widgetFolder, widgetImgFolder, null, Config.modules.volume);
    return await Widget.widgetAction(even, periphInfo);
  } else {
    currentwidgetState = even.value.action === 'On' ? true : false;
    if (!volumeWindow && even.value.action === 'On') return openVolumeWindow();
    if (volumeWindow && even.value.action === 'Off') return volumeWindow.destroy();
  }
}

export async function action(data, callback) {
  try {
    // Vérification de base sur data
    if (!data || !data.action || !data.action.command) {
      console.error('volume: action() -> données invalides:', data);
      callback();
      return;
    }

    // Table des actions
    const tblActions = {
      controlVolume: async () => controlVolume(data, false, 'setVolume'),
      controlVolumeGroup: async () => controlVolume(data, true, 'setVolumeGroup'),
      controlVolumeUnmute: async () => controlVolume(data, false, 'setUnmute'),
      controlVolumeMute: async () => controlVolume(data, false, 'setMute'),
      controlVolumeUp: async () => controlVolume(data, false, 'setVolumeUp'),
      controlVolumeDown: async () => controlVolume(data, false, 'setVolumeDown'),

      // Fonctions clientPlugin
      setVolumeClient: () => audio.setVolume(data.action.volume),
      setMuteClient: () => audio.mute(),
      setUnuteClient: () => audio.unmute(),
      setVolumeUpClient: () => audio.increaseVolume(5),
      setVolumeDownClient: () => audio.decreaseVolume(5),
    };

    await tblActions[data.action.command]();

    infoConsole(data);
    // Trace console
    info('volume: ', data.action.command, L.get('plugin.from'), data.client, L.get('plugin.to'), data.toClient);
  } catch (err) {
    if (data && data.client) Avatar.Speech.end(data.client);
    if (err.message) error(err.message);
  }

  // Toujours appeler le callback à la fin
  callback();
}

const openVolumeWindow = async () => {
  if (volumeWindow) return volumeWindow.show();

  let style = {
    parent: Avatar.Interface.mainWindow(),
    frame: false,
    movable: true,
    resizable: true,
    minimizable: false,
    alwaysOnTop: false,
    show: false,
    width: 440,
    height: 220,
    opacity: 1,
    icon: path.resolve(__dirname, 'assets', 'images', 'volume.png'),
    webPreferences: {
      preload: path.resolve(__dirname, 'assets', 'html', 'settings-preload.js'),
    },
    title: 'Paramètres Volume',
  };

  if (fs.existsSync(path.resolve(__dirname, 'assets', 'style.json'))) {
    let prop = fs.readJsonSync(path.resolve(__dirname, 'assets', 'style.json'), { throws: false });
    if (prop) {
      style.x = prop.x;
      style.y = prop.y;
    }
  }

  volumeWindow = await Avatar.Interface.BrowserWindow(style, path.resolve(__dirname, 'assets', 'html', 'settings.html'), false);

  volumeWindow.once('ready-to-show', () => {
    volumeWindow.show();
    volumeWindow.webContents.send('onInit-volume', Config.modules.volume);
    if (Config.modules.volume.devTools) volumeWindow.webContents.openDevTools();
  });

  Avatar.Interface.ipcMain().on('volume-quit', () => {
    volumeWindow.destroy();
    Avatar.Interface.refreshWidgetInfo({ plugin: 'volume', id: '121212' });
  });

  Avatar.Interface.ipcMain().handle('set-volume', async (_event, arg) => {
    const muted = await audio.isMutedStatus();
    if (muted) {
      await audio.unmute();
    }
    return audio.setVolume(arg);
  });

  Avatar.Interface.ipcMain().handle('set-mute', async (_event) => {
    return audio.mute();
  });

  Avatar.Interface.ipcMain().handle('get-volume', async (_event) => {
    return audio.getVolume();
  });

  Avatar.Interface.ipcMain().handle('set-unmute', async (_event) => {
    return audio.unmute();
  });

  // returns the localized message defined in arg
  Avatar.Interface.ipcMain().handle('volume-msg', async (_event, arg) => {
    return Locale.get(arg);
  });

  volumeWindow.on('closed', () => {
    currentwidgetState = false;
    Avatar.Interface.ipcMain().removeHandler('volume-msg');
    Avatar.Interface.ipcMain().removeHandler('set-volume');
    Avatar.Interface.ipcMain().removeHandler('get-volume');
    Avatar.Interface.ipcMain().removeHandler('set-mute');
    Avatar.Interface.ipcMain().removeHandler('set-unmute');
    Avatar.Interface.ipcMain().removeAllListeners('volume-quit');
    volumeWindow = null;
  });
};

const controlVolume = async (data, allClients, type) => {
  const dataVolume = data.volume;
  let tts = '';

  // Vérification de dataVolume si nécessaire
  if (type === 'setVolume' || type === 'setVolumeGroup') {
    if (typeof dataVolume !== 'number' || isNaN(dataVolume)) {
      Avatar.speak(Locale.get('message.novolumedefine'), data.client, () => {
        return;
      });
    }
  }

  // On récupère le texte à dire selon l'action
  switch (type) {
    case 'setVolume':
      tts = await Locale.get(['message.setvolume', data.toClient, dataVolume]);
      break;
    case 'setVolumeGroup':
      tts = await Locale.get(['message.setvolumegroup', data.toClient, dataVolume]);
      break;
    case 'setVolumeUp':
      tts = await Locale.get(['message.setvolumeup']);
      break;
    case 'setVolumeDown':
      tts = await Locale.get(['message.setvolumedown']);
      break;
    case 'setMute':
      tts = await Locale.get('message.setmute');
      break;
    case 'setUnmute':
      tts = await Locale.get('message.setunmute');
      break;
    default:
      console.error(`volume: controlVolume -> type inconnu: ${type}`);
      return;
  }

  const executeLocalAudioAction = () => {
    switch (type) {
      case 'setVolume':
        audio.setVolume(dataVolume);
        break;
      case 'setVolumeGroup':
        audio.setVolume(dataVolume);
        break;
      case 'setVolumeUp':
        audio.increaseVolume(Config.modules.volume.incrementVolume || 2);
        break;
      case 'setVolumeDown':
        audio.decreaseVolume(Config.modules.volume.incrementVolume || 2);
        break;
      case 'setMute':
        audio.mute();
        break;
      case 'setUnmute':
        audio.unmute();
        break;
    }
  };

  // Payload distant : data complet + action modifié
  const remotePayload = {
    ...data,
    action: {
      ...data.action,
      command: `${type}Client`,
      ...(type === 'setVolume' || type === 'setVolumeGroup' ? { volume: dataVolume } : {}),
    },
  };

  // Cas local ou distant
  if (!data.action.remote) {
    // true = sur le serveur A.V.A.T.A.R, false = sur le client qui se trouve sur la même machine que le serveur
    const onServer = Config.modules.volume.onServer;

    if (allClients) {
      Avatar.speak(tts, data.client, () => {
        const clients = Avatar.Socket.getClients();
        clients.forEach((client) => {
          if (client.is_mobile) return;
          const sameIP = Config.http.ip === client.ip;
          if (!onServer || !sameIP) {
            data.action.remote = true;
            Avatar.clientPlugin(client, 'volume', remotePayload);
          }
        });
      });
    } else {
      const client = Avatar.getTrueClient(data.toClient);
      const clientInfos = Avatar.Socket.getClient(client);

      if (Config.http.ip === clientInfos.ip) {
        // Exécution locale
        Avatar.speak(tts, data.client, () => {
          executeLocalAudioAction();
        });
      } else {
        // Exécution distante sur un autre client
        Avatar.speak(tts, data.client, () => {
          data.action.remote = true;
          Avatar.clientPlugin(client, 'volume', remotePayload);
        });
      }
    }
  } else {
    // Commande distante exécutée localement après transfert
    Avatar.speak(tts, data.client, () => {
      executeLocalAudioAction();
    });
  }
};
