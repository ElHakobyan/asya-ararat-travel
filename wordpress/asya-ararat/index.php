<?php defined('ABSPATH') || exit; ?>
<!doctype html><html <?php language_attributes(); ?>><head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width,initial-scale=1"><?php wp_head(); ?></head><body <?php body_class(); ?>><?php wp_body_open(); ?>
<main class="wrap section"><a href="<?php echo esc_url(home_url('/')); ?>">← Asya Ararat Travel</a>
<?php if(have_posts()):while(have_posts()):the_post(); ?><article><h1><?php the_title(); ?></h1><?php the_post_thumbnail('large'); the_content(); ?></article><?php endwhile;the_posts_pagination();else: ?><p>Страница не найдена.</p><?php endif; ?></main><?php wp_footer(); ?></body></html>
