
// ФАЙЛ: /js/interactive_video.js
document.addEventListener('DOMContentLoaded', function() {
    const videoContainers = document.querySelectorAll('.video-container');

    videoContainers.forEach(container => {
        const playButton = container.querySelector('.play-button');
        const video = container.querySelector('video');
        let isLoaded = false;

        function playVideo() {
            if (!isLoaded) {
                // Если видео не загружено, берем src из data-атрибута
                if (video.dataset.src) {
                    video.src = video.dataset.src;
                    video.load();
                    isLoaded = true;
                }
            }
            // Проигрываем видео и скрываем кнопку
            video.play();
            container.classList.add('is-playing');
        }

        function pauseVideo() {
            video.pause();
            container.classList.remove('is-playing');
        }

        // Клик по кнопке "Play"
        playButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Останавливаем "всплытие" события
            playVideo();
        });

        // Клик по самому видео (для паузы)
        video.addEventListener('click', (e) => {
            if (isLoaded && !video.paused) {
                e.stopPropagation();
                pauseVideo();
            } else if (isLoaded && video.paused) {
                e.stopPropagation();
                playVideo();
            }
        });
    });
});
