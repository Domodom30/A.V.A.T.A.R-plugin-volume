import loudness from 'loudness';
import os from 'os';
import { exec } from 'child_process';

class AudioController {
  constructor() {
    this.platform = os.platform();
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
        infoOrange(`OS non pris en charge : ${this.platform}. Certaines fonctionnalités risquent de ne pas fonctionner.`);
    }
  }

  _checkLinuxDependencies() {
    exec('which amixer', (error, stdout) => {
      if (error || !stdout.trim()) {
        infoOrange('Attention : "amixer" n\'est pas installé. Installez-le avec "sudo apt install alsa-utils".');
      }
    });
  }

  async _ensureSupported() {
    const supportedPlatforms = ['win32', 'darwin', 'linux'];
    if (!supportedPlatforms.includes(this.platform)) {
      infoOrange(`Le système d'exploitation ${this.platform} n'est pas supporté par ce contrôleur audio.`);
    }
  }

  async getVolume() {
    await this._ensureSupported();
    return await loudness.getVolume();
  }

  async setVolume(value) {
    await this._ensureSupported();

    const volume = Math.max(0, Math.min(100, value));
    const isMuted = await loudness.getMuted();

    if (isMuted && volume > 0) {
      await loudness.setMuted(false);
    }

    await loudness.setVolume(volume);
  }

  async increaseVolume(step) {
    await this._ensureSupported();

    const currentVolume = await loudness.getVolume();
    const isMuted = await loudness.getMuted();

    if (isMuted) {
      await loudness.setMuted(false);
    }

    await this.setVolume(currentVolume + step);
  }

  async decreaseVolume(step) {
    await this._ensureSupported();

    const currentVolume = await loudness.getVolume();
    await this.setVolume(currentVolume - step);
  }

  async mute() {
    await this._ensureSupported();

    const isMuted = await loudness.getMuted();

    if (!isMuted) {
      const currentVolume = await loudness.getVolume();

      if (currentVolume > 0) {
        this.previousVolume = currentVolume;
      }
      await loudness.setMuted(true);
    }
  }

  async unmute() {
    await this._ensureSupported();

    const isMuted = await loudness.getMuted();

    if (!isMuted) {
      return;
    }

    await loudness.setMuted(false);

    const currentVolume = await loudness.getVolume();

    if (this.previousVolume !== null && currentVolume === 0) {
      await loudness.setVolume(this.previousVolume);
    } else if (currentVolume === 0) {
      const defaultVolume = 50;
      await loudness.setVolume(defaultVolume);
    }

    this.previousVolume = null;
  }

  async isMutedStatus() {
    await this._ensureSupported();
    return await loudness.getMuted();
  }
}

export default AudioController;
