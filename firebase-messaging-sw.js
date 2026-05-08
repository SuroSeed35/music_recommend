importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// 1. main.js에 넣었던 것과 동일한 설정값을 여기에 그대로 넣습니다.
const firebaseConfig = {
    apiKey: "AIzaSyBD61ToNb3GEgNKRw_-IUN97Z4fCoDiYK8",
    authDomain: "musicrecommend-c0498.firebaseapp.com",
    projectId: "musicrecommend-c0498",
    storageBucket: "musicrecommend-c0498.appspot.com",
    messagingSenderId: "20112939467",
    appId: "1:20112939467:web:dc417a49069b1c402e7e4e"
};

// 파이어베이스 초기화
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 백그라운드 상태일 때 알림을 받아서 화면에 띄워주는 역할
messaging.onBackgroundMessage(function(payload) {
  console.log('백그라운드 메시지 수신:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '../img/logo.png' // 로고 이미지가 잘 나오도록 경로 확인
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});