FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    curl zip unzip git libzip-dev \
    && docker-php-ext-install pdo pdo_mysql zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN rm -f bootstrap/cache/*.php
RUN composer install --no-dev --optimize-autoloader --no-scripts
RUN php artisan package:discover --ansi

EXPOSE 8000

CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8000