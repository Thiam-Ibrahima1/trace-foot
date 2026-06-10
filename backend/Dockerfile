FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    curl zip unzip git libzip-dev ca-certificates \
    && docker-php-ext-install pdo pdo_mysql zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN rm -f bootstrap/cache/*.php
RUN composer install --no-dev --optimize-autoloader --no-scripts
RUN php artisan package:discover --ansi

RUN mkdir -p storage/framework/cache/data
RUN mkdir -p storage/framework/sessions
RUN mkdir -p storage/framework/views
RUN chmod -R 775 storage

EXPOSE 8000

CMD php -r "try { new PDO('mysql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT').';dbname='.getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD'), [PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false]); echo 'DB OK'; } catch(Exception \$e) { echo \$e->getMessage(); }" && php artisan config:clear && php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8000