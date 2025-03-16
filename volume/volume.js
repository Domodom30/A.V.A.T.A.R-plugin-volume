import * as path from 'node:path';
import fs from 'fs-extra';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/**
 * Uncomment, remove imports, methods, and other relationships below if you want to use it or not.
 */

//import * as volumeLib from './lib/volume.js';
//const volumeAPI = await volumeLib.init();

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

/**
 * Saves widget positions when A.V.A.T.A.R closes (json files saved in ./asset/widget folder)
 @param {object} widgets - widgets of the plugin
 */
export async function onClose(widgets) {
  // Save widget positions
  if (Config.modules.volume.widget.display === true) {
    await Widget.initVar(widgetFolder, widgetImgFolder, null, Config.modules.volume);
    if (widgets) await Widget.saveWidgets(widgets);
  }

  // Do other stuff
}

/**
 * Executed at the loading of the plugin
 */
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

/**
 * Searchs for existing Widgets when initializing A.V.A.T.A.R
 * Executed upon loading the plugin
 @return {object} object - the list of existing widgets (json files) saved in ./asset/widget folder
 */
export async function getWidgetsOnLoad() {
  if (Config.modules.volume.widget.display === true) {
    await Widget.initVar(widgetFolder, widgetImgFolder, null, Config.modules.volume);
    let widgets = await Widget.getWidgets();
    return { plugin: 'volume', widgets: widgets, Config: Config.modules.volume };
  }
}

/**
 * Executed after all widgets are loaded in the A.V.A.T.A.R interface
 * for example, used to refresh information of a widget
 @return {none}
 */
export async function readyToShow() {
  // Do stuff
}

/**
 * Requested only if a widget type is 'button' 
 * returns the new button image state to display 
 * 
 @param {object} arg - button parameters
 @return {string} 
 */
export async function getNewButtonState(arg) {
  return currentwidgetState === true ? 'Off' : 'On';
}

/**
 * Mandatory do not remove !
 * Returns existing widgets
 @return {object} 
 */
export async function getPeriphInfo() {
  return periphInfo;
}

/**
 * Action performed by clicking on a widget image
 @param {object} even - button parameters
 */
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
    Locale = await Avatar.lang.getPak('volume', data.language);
    if (!Locale) {
      throw new Error(`volume: Unable to find the '${data.language}' language pak.`);
    }

    // Table of actions
    const tblActions = {
      setVolume: async () => {
        Avatar.speak(await Lget(['message.volume'], data.action.volume), data.client, () => {
          audio.setVolume(data.action.volume);
        });
      },
    };

    // Writes info console
    info('volume:', data.action.command, L.get('plugin.from'), data.client);

    // Calls the function that should be run
    tblActions[data.action.command]();
  } catch (err) {
    if (data.client) Avatar.Speech.end(data.client);
    if (err.message) error(err.message);
  }

  // Returns callback
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
    width: 420,
    height: 190,
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
    return await Locale.get(arg);
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

const Lget = async (target, ...args) => {
  if (args) {
    target = [target];
    args.forEach((arg) => {
      target.push(arg);
    });
  }
  return await Locale.get(target);
};
