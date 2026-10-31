<?php
/** Asya Ararat: native WordPress administration. No Supabase required. */
defined('ABSPATH') || exit;
function asya_asset($file) { return get_template_directory_uri() . '/assets/' . $file; }
function asya_phone() { $v=preg_replace('/\D/', '', get_theme_mod('asya_phone', '37493108303')); return strlen($v)>=7 && strlen($v)<=15 ? $v : '37493108303'; }
function asya_defaults() { return json_decode(file_get_contents(get_template_directory().'/defaults.json'), true); }
function asya_dictionary() {
 $data=asya_defaults();
 foreach ($data as $lang=>&$fields) foreach ($fields as $key=>&$text) $text=get_theme_mod('asya_'.$lang.'_'.$key, $text);
 return $data;
}
add_action('after_setup_theme', function(){ add_theme_support('title-tag'); add_theme_support('post-thumbnails'); add_theme_support('custom-logo'); });
add_action('wp_enqueue_scripts', function(){
 wp_enqueue_style('asya', get_stylesheet_uri(), array(), '1.0.0');
 if (!is_front_page()) return;
 wp_enqueue_script('asya', asya_asset('site.js'), array(), '1.0.0', true);
 wp_add_inline_script('asya', 'window.SUPABASE_CONFIG={};window.ASYA_WP='.wp_json_encode(array('dictionary'=>asya_dictionary(), 'phone'=>asya_phone(), 'tours'=>asya_tour_data()), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT).';', 'before');
 wp_add_inline_script('asya', file_get_contents(get_template_directory().'/assets/tours.js'), 'after');
});
add_action('wp_head',function(){
 if (!is_front_page()) return;
 echo '<style>.hero{background-image:linear-gradient(90deg,rgba(0,0,0,.35),transparent),url("'.esc_url(get_theme_mod('asya_hero', asya_asset('hero-mock.jpg'))).'")}</style>';
});
add_action('init',function(){register_post_type('asya_tour',array(
 'labels'=>array('name'=>'Туры','singular_name'=>'Тур','add_new'=>'Добавить тур','add_new_item'=>'Добавить тур','edit_item'=>'Редактировать тур'),
 'public'=>true,'show_in_rest'=>true,'menu_icon'=>'dashicons-palmtree','supports'=>array('title','editor','thumbnail','page-attributes','revisions'),'rewrite'=>array('slug'=>'tours')
));});
add_action('customize_register',function($c){
 $c->add_panel('asya_content',array('title'=>'Asya Ararat — содержимое','priority'=>30));
 $labels=array('ru'=>'Русский','en'=>'English','hy'=>'Հայերեն');
 $groups=array('home'=>'Главная','tours'=>'Туры','about'=>'О компании','gallery'=>'Галерея','reviews'=>'Отзывы','contact'=>'Контакты','headline'=>'Главный заголовок','intro'=>'Вступительный текст','aboutTitle'=>'Заголовок «О компании»','aboutText'=>'Текст «О компании»','visaText'=>'Текст о визовой поддержке','contactTitle'=>'Заголовок контактов','contactText'=>'Текст контактов');
 foreach(asya_defaults() as $lang=>$fields){
  $section='asya_'.$lang; $c->add_section($section,array('title'=>'Тексты — '.$labels[$lang],'panel'=>'asya_content'));
  foreach($fields as $key=>$default){
   $id='asya_'.$lang.'_'.$key;
   $c->add_setting($id,array('default'=>$default,'sanitize_callback'=>'sanitize_textarea_field'));
   $c->add_control($id,array('label'=>isset($groups[$key])?$groups[$key]:$default,'description'=>$key,'section'=>$section,'type'=>'textarea'));
  }
 }
 $c->add_section('asya_images',array('title'=>'Фото и контакты','panel'=>'asya_content'));
 $c->add_setting('asya_phone',array('default'=>'+374 93 10 83 03','sanitize_callback'=>'sanitize_text_field'));
 $c->add_control('asya_phone',array('label'=>'Телефон для WhatsApp / Viber / Telegram (с кодом страны)','section'=>'asya_images'));
 $images=array('hero'=>'Главное фото','logo'=>'Логотип','about_image'=>'Фото в разделе о компании','gallery_1'=>'Галерея 1','gallery_2'=>'Галерея 2','gallery_3'=>'Галерея 3','gallery_4'=>'Галерея 4');
 foreach($images as $key=>$label){$id='asya_'.$key;$c->add_setting($id,array('sanitize_callback'=>'esc_url_raw'));$c->add_control(new WP_Customize_Image_Control($c,$id,array('label'=>$label,'section'=>'asya_images')));}
});
add_action('add_meta_boxes',function(){add_meta_box('asya_details','Цена, даты и переводы','asya_meta_box','asya_tour','normal','high');});
function asya_meta_box($post){
 wp_nonce_field('asya_save_tour','asya_nonce');
 echo '<p>Название и основное описание выше — русский вариант. Обложку выберите в «Изображение записи». Черновик не виден посетителям.</p>';
 $fields=array('price'=>'Цена от (пусто — по запросу)','currency'=>'Валюта: USD, EUR или AMD','dates'=>'Даты (RU)','program'=>'Программа (RU)','title_en'=>'Название (EN)','description_en'=>'Описание (EN)','dates_en'=>'Даты (EN)','program_en'=>'Программа (EN)','title_hy'=>'Название (HY)','description_hy'=>'Описание (HY)','dates_hy'=>'Даты (HY)','program_hy'=>'Программа (HY)');
 foreach($fields as $key=>$label){$value=get_post_meta($post->ID,'_asya_'.$key,true);echo '<p><label for="asya_'.esc_attr($key).'"><strong>'.esc_html($label).'</strong></label><br><textarea style="width:100%" rows="'.(strpos($key,'program')!==false?'5':'2').'" id="asya_'.esc_attr($key).'" name="asya['.esc_attr($key).']">'.esc_textarea($value).'</textarea></p>';}
}
function asya_clean_price($v){return $v!=='' && is_numeric($v) && (float)$v>=0 ? round((float)$v,2) : '';}
add_action('save_post_asya_tour',function($id){
 if(defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)return;
 if(!isset($_POST['asya_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['asya_nonce'])),'asya_save_tour') || !current_user_can('edit_post',$id))return;
 if(!isset($_POST['asya']) || !is_array($_POST['asya']))return;
 $data=wp_unslash($_POST['asya']);
 foreach(array('price','currency','dates','program','title_en','description_en','dates_en','program_en','title_hy','description_hy','dates_hy','program_hy') as $key){
  if(!isset($data[$key]) || !is_scalar($data[$key]))continue;
  $v=sanitize_textarea_field($data[$key]);
  if($key==='price')$v=asya_clean_price($v);
  if($key==='currency')$v=in_array(strtoupper($v),array('USD','EUR','AMD'),true)?strtoupper($v):'USD';
  update_post_meta($id,'_asya_'.$key,$v);
 }
});
function asya_tour_data(){
 $posts=get_posts(array('post_type'=>'asya_tour','post_status'=>'publish','numberposts'=>-1,'orderby'=>array('menu_order'=>'ASC','date'=>'DESC')));$out=array();
 foreach($posts as $p){
  $tr=array('ru'=>array('title'=>$p->post_title,'description'=>wp_strip_all_tags($p->post_content),'dates'=>get_post_meta($p->ID,'_asya_dates',true),'program'=>get_post_meta($p->ID,'_asya_program',true)));
  foreach(array('en','hy') as $l){$tr[$l]=array();foreach(array('title','description','dates','program') as $key)$tr[$l][$key]=get_post_meta($p->ID,'_asya_'.$key.'_'.$l,true);}
  $out[]=array('translations'=>$tr,'image'=>get_the_post_thumbnail_url($p,'large')?:'','price'=>get_post_meta($p->ID,'_asya_price',true),'currency'=>get_post_meta($p->ID,'_asya_currency',true)?:'USD');
 }
 return $out;
}
function asya_tours(){echo '<section id="tours" class="section alt"><div class="wrap"><div class="heading"><h2 data-i="ourTours">Наши туры в Японию</h2></div><div class="cards" id="wpTours"><p>Уточните доступные туры у менеджера.</p></div></div></section>';}
