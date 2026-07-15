<?php
/**
 * Native metadata editing for ads and placements.
 *
 * @package MagickAD
 */

namespace MagickAD\Admin;

use MagickAD\Data\Post_Types;
use WP_Post;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers, renders, and saves native meta boxes.
 */
final class Meta_Boxes {
	private const NONCE_ACTION = 'magick_ad_save_meta';
	private const NONCE_NAME   = 'magick_ad_meta_nonce';

	/**
	 * Register both meta boxes.
	 */
	public static function register(): void {
		// Required for core REST meta support, but not a second editing surface.
		remove_meta_box( 'postcustom', Post_Types::AD_POST_TYPE, 'normal' );
		remove_meta_box( 'postcustom', Post_Types::PLACEMENT_POST_TYPE, 'normal' );

		add_meta_box(
			'magick-ad-schedule',
			__( 'Ad Schedule', 'magick-ad' ),
			array( self::class, 'render_ad_box' ),
			Post_Types::AD_POST_TYPE,
			'side',
			'default'
		);

		add_meta_box(
			'magick-ad-placement',
			__( 'Placement Configuration', 'magick-ad' ),
			array( self::class, 'render_placement_box' ),
			Post_Types::PLACEMENT_POST_TYPE,
			'normal',
			'high'
		);
	}

	/**
	 * Render the ad expiration field.
	 *
	 * @param WP_Post $post Current ad.
	 */
	public static function render_ad_box( WP_Post $post ): void {
		wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );

		$end_at    = (string) get_post_meta( $post->ID, Post_Types::AD_END_AT_META, true );
		$input_end = '' !== $end_at ? str_replace( ' ', 'T', substr( $end_at, 0, 16 ) ) : '';
		?>
		<p>
			<label for="magick-ad-end-at"><strong><?php esc_html_e( 'Stop showing after', 'magick-ad' ); ?></strong></label>
		</p>
		<p>
			<input class="widefat" type="datetime-local" id="magick-ad-end-at" name="magick_ad_end_at" value="<?php echo esc_attr( $input_end ); ?>" />
		</p>
		<p class="description"><?php esc_html_e( 'Uses the site timezone. Leave empty for no end date.', 'magick-ad' ); ?></p>
		<?php
	}

	/**
	 * Render ad, location, and device selectors for a placement.
	 *
	 * @param WP_Post $post Current placement.
	 */
	public static function render_placement_box( WP_Post $post ): void {
		wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );

		$ad_id    = (int) get_post_meta( $post->ID, Post_Types::PLACEMENT_AD_META, true );
		$location = Post_Types::sanitize_location(
			get_post_meta( $post->ID, Post_Types::PLACEMENT_LOCATION, true )
		);
		$device   = Post_Types::sanitize_device(
			get_post_meta( $post->ID, Post_Types::PLACEMENT_DEVICE_META, true )
		);
		$ads      = get_posts(
			array(
				'post_type'      => Post_Types::AD_POST_TYPE,
				'post_status'    => array( 'publish', 'future', 'draft', 'private' ),
				'posts_per_page' => -1,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		?>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="magick-ad-ad-id"><?php esc_html_e( 'Ad', 'magick-ad' ); ?></label></th>
				<td>
					<select id="magick-ad-ad-id" name="magick_ad_ad_id">
						<option value="0"><?php esc_html_e( 'Select an ad', 'magick-ad' ); ?></option>
						<?php foreach ( $ads as $ad ) : ?>
							<?php
							$ad_label = $ad->post_title;
							if ( '' === $ad_label ) {
								/* translators: %d: ad post ID. */
								$ad_label = sprintf( __( 'Ad #%d', 'magick-ad' ), $ad->ID );
							}
							?>
							<option value="<?php echo esc_attr( (string) $ad->ID ); ?>" <?php selected( $ad_id, $ad->ID ); ?>>
								<?php echo esc_html( $ad_label ); ?>
							</option>
						<?php endforeach; ?>
					</select>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="magick-ad-location"><?php esc_html_e( 'Location', 'magick-ad' ); ?></label></th>
				<td>
					<select id="magick-ad-location" name="magick_ad_location">
						<option value="block" <?php selected( $location, 'block' ); ?>><?php esc_html_e( 'Block', 'magick-ad' ); ?></option>
						<option value="shortcode" <?php selected( $location, 'shortcode' ); ?>><?php esc_html_e( 'Shortcode', 'magick-ad' ); ?></option>
						<option value="content_before" <?php selected( $location, 'content_before' ); ?>><?php esc_html_e( 'Before post content', 'magick-ad' ); ?></option>
						<option value="content_after" <?php selected( $location, 'content_after' ); ?>><?php esc_html_e( 'After post content', 'magick-ad' ); ?></option>
					</select>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="magick-ad-device"><?php esc_html_e( 'Device', 'magick-ad' ); ?></label></th>
				<td>
					<select id="magick-ad-device" name="magick_ad_device">
						<option value="all" <?php selected( $device, 'all' ); ?>><?php esc_html_e( 'All devices', 'magick-ad' ); ?></option>
						<option value="desktop" <?php selected( $device, 'desktop' ); ?>><?php esc_html_e( 'Desktop', 'magick-ad' ); ?></option>
						<option value="mobile" <?php selected( $device, 'mobile' ); ?>><?php esc_html_e( 'Mobile', 'magick-ad' ); ?></option>
					</select>
				</td>
			</tr>
		</table>
		<p class="description"><?php esc_html_e( 'Publish this placement to enable it. Keep it as a draft to disable it.', 'magick-ad' ); ?></p>
		<?php
	}

	/**
	 * Save validated post metadata.
	 *
	 * @param int     $post_id Current post ID.
	 * @param WP_Post $post    Current post.
	 */
	public static function save( int $post_id, WP_Post $post ): void {
		if ( ! in_array( $post->post_type, array( Post_Types::AD_POST_TYPE, Post_Types::PLACEMENT_POST_TYPE ), true ) ) {
			return;
		}

		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
			return;
		}

		if ( ! current_user_can( 'manage_magick_ads' ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$nonce = isset( $_POST[ self::NONCE_NAME ] )
			? sanitize_text_field( wp_unslash( $_POST[ self::NONCE_NAME ] ) )
			: '';
		if ( '' === $nonce || ! wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			return;
		}
		$post_data = array(
			'magick_ad_end_at'  => isset( $_POST['magick_ad_end_at'] )
				? sanitize_text_field( wp_unslash( $_POST['magick_ad_end_at'] ) )
				: '',
			'magick_ad_ad_id'   => isset( $_POST['magick_ad_ad_id'] )
				? absint( wp_unslash( $_POST['magick_ad_ad_id'] ) )
				: 0,
			'magick_ad_location' => isset( $_POST['magick_ad_location'] )
				? sanitize_key( wp_unslash( $_POST['magick_ad_location'] ) )
				: '',
			'magick_ad_device'  => isset( $_POST['magick_ad_device'] )
				? sanitize_key( wp_unslash( $_POST['magick_ad_device'] ) )
				: '',
		);

		if ( Post_Types::AD_POST_TYPE === $post->post_type ) {
			self::save_ad( $post_id, $post_data );
			return;
		}

		self::save_placement( $post_id, $post_data );
	}

	/**
	 * Save the ad expiration field.
	 *
	 * @param int                  $post_id   Ad ID.
	 * @param array<string, mixed> $post_data Verified form data.
	 */
	private static function save_ad( int $post_id, array $post_data ): void {
		$raw_end_at = isset( $post_data['magick_ad_end_at'] )
			? sanitize_text_field( (string) $post_data['magick_ad_end_at'] )
			: '';

		if ( '' === $raw_end_at ) {
			delete_post_meta( $post_id, Post_Types::AD_END_AT_META );
			return;
		}

		$normalized = str_replace( 'T', ' ', $raw_end_at );
		if ( 16 === strlen( $normalized ) ) {
			$normalized .= ':00';
		}

		$end_at = Post_Types::sanitize_end_at( $normalized );
		if ( '' !== $end_at ) {
			update_post_meta( $post_id, Post_Types::AD_END_AT_META, $end_at );
		}
	}

	/**
	 * Save placement metadata after allow-list validation.
	 *
	 * @param int                  $post_id   Placement ID.
	 * @param array<string, mixed> $post_data Verified form data.
	 */
	private static function save_placement( int $post_id, array $post_data ): void {
		$ad_id = isset( $post_data['magick_ad_ad_id'] ) ? absint( $post_data['magick_ad_ad_id'] ) : 0;
		if ( 0 !== $ad_id && Post_Types::AD_POST_TYPE !== get_post_type( $ad_id ) ) {
			$ad_id = 0;
		}

		$raw_location = isset( $post_data['magick_ad_location'] )
			? sanitize_key( (string) $post_data['magick_ad_location'] )
			: '';
		$raw_device   = isset( $post_data['magick_ad_device'] )
			? sanitize_key( (string) $post_data['magick_ad_device'] )
			: '';

		if ( ! in_array( $raw_location, Post_Types::LOCATIONS, true ) || ! in_array( $raw_device, Post_Types::DEVICES, true ) ) {
			return;
		}

		update_post_meta( $post_id, Post_Types::PLACEMENT_AD_META, $ad_id );
		update_post_meta( $post_id, Post_Types::PLACEMENT_LOCATION, $raw_location );
		update_post_meta( $post_id, Post_Types::PLACEMENT_DEVICE_META, $raw_device );
	}
}
