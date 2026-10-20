const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
if (menu && navigation) {
  document.documentElement.classList.add('js');
  menu.hidden = false;
  const setOpen = (open) => {
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
    menu.lastElementChild.textContent = open ? '−' : '+';
  };
  menu.addEventListener('click', () => setOpen(menu.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      menu.focus();
    }
  });
}
