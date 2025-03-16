const setVolume = document.querySelector('#set-volume');
const setMute = document.querySelector('#set-mute');
const setUnmute = document.querySelector('#set-unmute');
const setOff = document.querySelector('#close');
let valueVolume;

window.onbeforeunload = async (e) => {
  e.returnValue = false;
  window.electronAPI.quit();
};

setOff.addEventListener('click', () => {
  window.electronAPI.quit();
});

setVolume.addEventListener('change', async () => {
  valueVolume = setVolume.value;

  await window.electronAPI.setVolume(valueVolume);
  if (valueVolume === 0) {
    showNotification(await Lget(['message.mute']), 'warning');
  } else {
    showNotification(await Lget(['message.volume'], valueVolume), 'success');
  }
});

setMute.addEventListener('click', async () => {
  await window.electronAPI.setMute();
  showNotification(await Lget(['message.mute']), 'warning');
});

setUnmute.addEventListener('click', async () => {
  await window.electronAPI.setUnmute();
  if (valueVolume === 0) {
    showNotification(await Lget(['message.mute']), 'warning');
  } else {
    showNotification(await Lget(['message.volume'], valueVolume), 'success');
  }
});

async function setTargets() {
  document.querySelector('#title').innerHTML = await Lget('message.title');
  setVolume.value = valueVolume;
  if (valueVolume === 0) {
    showNotification(await Lget(['message.mute']), 'warning');
  } else {
    showNotification(await Lget(['message.volume'], valueVolume), 'success');
  }
}

const Lget = async (target, ...args) => {
  if (args) {
    target = [target];
    args.forEach((arg) => {
      target.push(arg);
    });
  }

  return await window.electronAPI.volumeMsg(target);
};

// Fonction pour afficher une notification
const showNotification = function (message, type) {
  notification.textContent = message;
  notification.classList.remove('hidden', 'warning', 'error', 'success');
  notification.classList.add('show');
  notification.classList.add(type);
  notification.style.display = 'block';
};

window.electronAPI.onInitVolume(async (config) => {
  valueVolume = await window.electronAPI.getVolume();
  await setTargets(config);
});
