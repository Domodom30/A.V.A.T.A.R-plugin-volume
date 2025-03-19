import loudness from 'loudness';
import os from 'os';
import { exec } from 'child_process';

class AudioController {
  constructor() {
    this.platform = os.platform(); // 'win32', 'darwin', 'linux'
    this.previousVolume = null;

    this._checkSystemSupport();
  }

  _checkSystemSupport() {
    switch (this.platform) {
      case 'win32':
        break;
      case 'darwin':
        break;
      case 'linux':
        this._checkLinuxDependencies();
        break;
      default:
        console.warn(`OS non pris en charge : ${this.platform}. Certaines fonctionnalités risquent de ne pas fonctionner.`);
    }
  }

  _checkLinuxDependencies() {
    exec('which amixer', (error, stdout) => {
      if (error || !stdout.trim()) {
        console.warn('Attention : "amixer" n\'est pas installé. Installez-le avec "sudo apt install alsa-utils".');
      } else {
        return;
      }
    });
  }

  async getVolume() {
    await this._ensureSupported();
    const volume = await loudness.getVolume();
    return volume;
  }

  async setVolume(value) {
    await this._ensureSupported();
    const vol = Math.max(0, Math.min(100, value));
    const isMuted = await loudness.getMuted();
    if (isMuted && vol > 0) {
      await loudness.setMuted(false);
    }
    await loudness.setVolume(vol);
  }

  async increaseVolume(step = 5) {
    await this._ensureSupported();
    const currentVolume = await loudness.getVolume();
    const isMuted = await loudness.getMuted();
    if (isMuted) {
      await loudness.setMuted(false);
    }
    await this.setVolume(currentVolume + step);
  }

  async decreaseVolume(step = 5) {
    await this._ensureSupported();
    const currentVolume = await loudness.getVolume();
    await this.setVolume(currentVolume - step);
  }

  async mute() {
    await this._ensureSupported();
    const isMuted = await loudness.getMuted();
    if (!isMuted) {
      this.previousVolume = await loudness.getVolume();
      await loudness.setMuted(true);
    } else {
      return;
    }
  }

  async unmute() {
    await this._ensureSupported();
    const isMuted = await loudness.getMuted();
    if (isMuted) {
      await loudness.setMuted(false);
      if (this.previousVolume !== null) {
        await loudness.setVolume(this.previousVolume);
      }
    } else {
      return;
    }
  }

  async isMutedStatus() {
    await this._ensureSupported();
    const muted = await loudness.getMuted();
    return muted;
  }

  async _ensureSupported() {
    const supportedPlatforms = ['win32', 'darwin', 'linux'];
    if (!supportedPlatforms.includes(this.platform)) {
      console.error(`Le système d'exploitation ${this.platform} n'est pas supporté par ce contrôleur audio.`);
    }
  }
}

export default AudioController;
