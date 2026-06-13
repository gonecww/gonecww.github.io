chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'notify') {
    const id = 'vanta-' + Date.now();
    if (chrome.notifications) {
      chrome.notifications.create(id, {
        type: 'basic',
        title: msg.title || 'VANTA',
        message: msg.message || 'Update',
        iconUrl: 'icon.png'
      });
    }
  }
});

// context menu example (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'open-vanta', title: 'Open VANTA uploader', contexts: ['browser_action'] });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-vanta') {
    chrome.action.openPopup();
  }
});
