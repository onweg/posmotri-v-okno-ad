/* КОНФИГ */
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const endpoint = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;

// Демо-данные для fallback
const demoData = {
  results: [
    {
      id: 1,
      city: "Санкт-Петербург",
      description: "Вид на Неву и Петропавловскую крепость",
      video: { url: "/demo-videos/spb.mp4" },
      poster: { url: "/demo-images/spb-poster.jpg" },
      thumbnail: { url: "/demo-images/spb-thumb.jpg" }
    },
    {
      id: 2,
      city: "Москва",
      description: "Красная площадь и Кремль",
      video: { url: "/demo-videos/moscow.mp4" },
      poster: { url: "/demo-images/moscow-poster.jpg" },
      thumbnail: { url: "/demo-images/moscow-thumb.jpg" }
    }
  ],
  pagination: {
    page: 1,
    pageCount: 1
  }
};

/* ЭЛЕМЕНТЫ СТРАНИЦЫ */
const cardsList = document.querySelector('.content__list');
const cardsContainer = document.querySelector('.content__list-container');
const videoContainer = document.querySelector('.result__video-container');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('form');

/* ТЕМПЛЕЙТЫ */
const cardTmp = document.querySelector('.cards-list-item-template');
const preloaderTmp = document.querySelector('.preloader-template');
const videoNotFoundTmp = document.querySelector('.error-template');
const moreButtonTmp = document.querySelector('.more-button-template');

/* МЕХАНИКА */

// Нужен для работы с переключателями
let cardsOnPageState = [];

// Первая загрузка ✅

showPreloader(preloaderTmp, videoContainer);
showPreloader(preloaderTmp, cardsContainer);
mainMechanics(endpoint);

// осуществляется поиск ✅
form.onsubmit = (e) => {
  e.preventDefault();

  cardsList.textContent = '';
  const buttonInDOM = cardsContainer.querySelector('.more-button');
  if (buttonInDOM) {
    buttonInDOM.remove();
  }

  [...videoContainer.children].forEach((el) => {
    el.className === 'error' && el.remove();
  });

  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);

  const formData = serializeFormData(form);
  const requestUrl = generateFilterRequest(
    endpoint,
    formData.city,
    formData.timeArray
  );

  mainMechanics(requestUrl);
};

/* ФУНКЦИЯ, КОТОРАЯ ВСЕ ГЕНЕРИТ */

async function mainMechanics(endpoint) {
  try {
    // Добавляем обработку CORS и таймаут
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
    
    const response = await fetch(endpoint, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    cardsOnPageState = data.results;

    if (!data?.results?.[0]) {
      throw new Error('not-found');
    }

    appendCards({
      baseUrl: BASE_URL,
      dataArray: data.results,
      cardTmp,
      container: cardsList,
    });

    setVideo({
      baseUrl: BASE_URL,
      video: videoElement,
      videoUrl: data.results[0].video.url,
      posterUrl: data.results[0].poster.url,
    });
    document
      .querySelectorAll('.content__card-link')[0]
      .classList.add('content__card-link_current');
    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');

    // Добавляем класс для стилизации скроллбара
    cardsContainer.classList.add('custom-scrollbar');

    chooseCurrentVideo({
      baseUrl: BASE_URL,
      videoData: cardsOnPageState,
      cardLinksSelector: '.content__card-link',
      currentLinkClassName: 'content__card-link_current',
      mainVideo: videoElement,
    });

    showMoreCards({
      dataArray: data,
      buttonTemplate: moreButtonTmp,
      cardsList,
      buttonSelector: '.more-button',
      initialEndpoint: endpoint,
      baseUrl: BASE_URL,
      cardTmp: cardTmp,
    });
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err);
    
    // Пытаемся использовать демо-данные при ошибке API
    if (err.name === 'AbortError' || err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
      console.log('Используем демо-данные из-за проблем с API');
      useDemoData();
    } else if (err.message === 'not-found') {
      showError(videoContainer, videoNotFoundTmp, 'Нет подходящих видео =(');
    } else {
      showError(videoContainer, videoNotFoundTmp, 'Ошибка получения данных :(');
    }
    
    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsContainer, '.preloader');
  }
}

/* УТИЛИТЫ */

// Функция для использования демо-данных при недоступности API
function useDemoData() {
  cardsOnPageState = demoData.results;
  
  appendCards({
    baseUrl: '',
    dataArray: demoData.results,
    cardTmp,
    container: cardsList,
  });

  // Показываем сообщение о демо-режиме
  const demoMessage = document.createElement('div');
  demoMessage.className = 'demo-message';
  demoMessage.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(255, 193, 7, 0.9);
    color: #000;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 1000;
  `;
  demoMessage.textContent = 'Демо-режим: API недоступен';
  document.body.appendChild(demoMessage);
  
  // Убираем сообщение через 5 секунд
  setTimeout(() => {
    if (demoMessage.parentNode) {
      demoMessage.parentNode.removeChild(demoMessage);
    }
  }, 5000);
  
  // Добавляем класс для стилизации скроллбара
  cardsContainer.classList.add('custom-scrollbar');
  
  chooseCurrentVideo({
    baseUrl: '',
    videoData: cardsOnPageState,
    cardLinksSelector: '.content__card-link',
    currentLinkClassName: 'content__card-link_current',
    mainVideo: videoElement,
  });
}

// Простой промис, чтобы легче ставить паузу ✅

async function delay(ms) {
  return await new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
}

// Промис, который резолвится, если видео целиком готово к проинрыванию без пауз

async function waitForReadyVideo(video) {
  return await new Promise((resolve) => {
    video.oncanplaythrough = resolve;
  });
}

// Устанавливает прелоадер на время загрузки данных ✅
function showPreloader(tmp, parent) {
  const node = tmp.content.cloneNode(true);
  parent.append(node);
  console.log('показал прелоадер');
}

// Убирает прелоадер из DOM ✅
function removePreloader(parent, preloaderSelector) {
  const preloader = parent.querySelector(preloaderSelector);
  if (preloader) {
    preloader.remove();
  }

  console.log('убрал прелоадер');
}

// Добавляет карточки в контейнер, собирая их из данных API ✅
function appendCards({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach((el) => {
    const node = cardTmp.content.cloneNode(true);
    node.querySelector('a').setAttribute('id', el.id);
    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent =
      el.description;
    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('src', `${baseUrl}${el.thumbnail.url}`);
    node
      .querySelector('.content__video-card-thumbnail')
      .setAttribute('alt', el.description);
    container.append(node);
  });
  console.log('Сгенерировал карточки');
}

// Устанавливет внужное видео в контейнер ✅
function setVideo({ baseUrl, video, videoUrl, posterUrl }) {
  video.setAttribute('src', `${baseUrl}${videoUrl}`);
  video.setAttribute('poster', `${baseUrl}${posterUrl}`);
  
  // Добавляем обработку ошибок загрузки видео
  video.onerror = function() {
    console.error('Ошибка загрузки видео:', videoUrl);
    // Можно показать placeholder или сообщение об ошибке
  };
  
  console.log('Подставил видео в основной блок');
}

// получает данные из формы и сериализует как надо ✅

function serializeFormData(form) {
  const city = form.querySelector('input[name="city"]');
  const checkboxes = form.querySelectorAll('input[name="time"]');
  const checkedValuesArray = [...checkboxes].reduce((acc, item) => {
    item.checked && acc.push(item.value);
    return acc;
  }, []);
  console.log('Собрал данные формы в объект');
  return {
    city: city.value,
    timeArray: checkedValuesArray,
  };
}

// Генерирует строку с фильтрами запросов в API в зависимости от данных из формы ✅
function generateFilterRequest(endpoint, city, timeArray) {
  if (city) {
    endpoint += `filters[city][$containsi]=${city}&`;
  }
  if (timeArray) {
    timeArray.forEach((timeslot) => {
      endpoint += `filters[time_of_day][$eqi]=${timeslot}&`;
    });
  }
  console.log('Сгенерировал строку адреса запроса в API из данных формы');
  return endpoint;
}

// переключает текущее видео ✅
function chooseCurrentVideo({
  baseUrl,
  videoData,
  cardLinksSelector,
  currentLinkClassName,
  mainVideo,
}) {
  const cardsList = document.querySelectorAll(cardLinksSelector);
  if (cardsList) {
    cardsList.forEach((item) => {
      item.onclick = async (e) => {
        e.preventDefault();
        cardsList.forEach((item) => {
          item.classList.remove(currentLinkClassName);
        });
        item.classList.add(currentLinkClassName);
        showPreloader(preloaderTmp, videoContainer);
        const vidoObj = videoData.find(
          (video) => String(video.id) === String(item.id)
        );
        setVideo({
          baseUrl,
          video: mainVideo,
          videoUrl: vidoObj.video.url,
          posterUrl: vidoObj.poster.url,
        });
        await waitForReadyVideo(mainVideo);
        await delay(preloaderWaitindTime);
        removePreloader(videoContainer, '.preloader');
        console.log('Переключил видео');
      };
    });
  }
}

// вывожу интерфейс, когда видео не найдено ✅
function showError(container, errorTemplate, errorMessage) {
  const node = errorTemplate.content.cloneNode(true);
  node.querySelector('.error__title').textContent = errorMessage;
  container.append(node);
  console.log('показал, ошибку');
}

// вывожу больше видео, если в пагинации больше страниц, чем показано

function showMoreCards({
  dataArray,
  buttonTemplate,
  cardsList,
  buttonSelector,
  initialEndpoint,
  baseUrl,
  cardTmp,
}) {
  if (dataArray.pagination.page === dataArray.pagination.pageCount) return;
  // добавить кнопку из темплейта в конец списка карточек
  const button = buttonTemplate.content.cloneNode(true);
  cardsContainer.append(button);
  // Выберем добавленный элемент по селектору и добавим слушатель клика
  const buttonInDOM = cardsContainer.querySelector(buttonSelector);
  buttonInDOM.addEventListener('click', async () => {
    // по клику запросим данные для следующей страницы
    let currentPage = dataArray.pagination.page;
    let urlToFetch = `${initialEndpoint}pagination[page]=${(currentPage += 1)}&`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(urlToFetch, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let data = await response.json();
      buttonInDOM.remove();
      cardsOnPageState = cardsOnPageState.concat(data.results);
      appendCards({
        baseUrl,
        dataArray: data.results,
        cardTmp,
        container: cardsList,
      });
      chooseCurrentVideo({
        baseUrl: BASE_URL,
        videoData: cardsOnPageState,
        cardLinksSelector: '.content__card-link',
        currentLinkClassName: 'content__card-link_current',
        mainVideo: videoElement,
      });
      showMoreCards({
        dataArray: data,
        buttonTemplate,
        cardsList,
        buttonSelector,
        initialEndpoint,
        baseUrl,
        cardTmp,
      });
    } catch (err) {
      console.error('Ошибка при загрузке дополнительных карточек:', err);
      buttonInDOM.textContent = 'Ошибка загрузки';
      buttonInDOM.disabled = true;
    }
  });
}
