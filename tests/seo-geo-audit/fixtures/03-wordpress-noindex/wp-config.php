<?php
/**
 * Configuration de base de WordPress.
 * Les identifiants réels sont dans les variables d'environnement du serveur.
 */

define( 'DB_NAME', getenv( 'WP_DB_NAME' ) );
define( 'DB_USER', getenv( 'WP_DB_USER' ) );
define( 'DB_PASSWORD', getenv( 'WP_DB_PASSWORD' ) );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );

define( 'WP_HOME', 'http://localhost:8703' );
define( 'WP_SITEURL', 'http://localhost:8703' );

$table_prefix = 'ab_';

define( 'WP_DEBUG', false );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
