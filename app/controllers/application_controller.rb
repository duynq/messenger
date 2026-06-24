class ApplicationController < ActionController::API
  before_action :configure_permitted_parameters, if: :devise_controller?
  before_action :authenticate_user!
  before_action :set_locale

  include Paginatable

  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :record_invalid
  rescue_from ArgumentError, with: :argument_error
  rescue_from ActionController::ParameterMissing, with: :parameter_missing
  rescue_from StandardError, with: :internal_server_error

  protected

  def set_locale
    header_locale = request.headers['Accept-Language']&.split(',')&.first&.split('-')&.first
    I18n.locale = I18n.available_locales.map(&:to_s).include?(header_locale) ? header_locale : I18n.default_locale
  end

  def parameter_missing(_exception)
    render json: { error: I18n.t('errors.bad_request') }, status: :bad_request
  end

  def argument_error(exception)
    message = Rails.env.development? ? exception.message : I18n.t('errors.unprocessable')
    render json: { error: message }, status: :unprocessable_entity
  end

  def record_not_found(_exception)
    render json: { error: I18n.t('errors.not_found') }, status: :not_found
  end

  def record_invalid(exception)
    message = Rails.env.development? ? exception.message : I18n.t('errors.unprocessable')
    render json: { error: message }, status: :unprocessable_entity
  end

  def internal_server_error(exception)
    Rails.logger.error("[#{exception.class}] #{exception.message}\n#{exception.backtrace&.first(5)&.join("\n")}")
    message = Rails.env.development? ? exception.message : I18n.t('errors.internal')
    render json: { error: message }, status: :internal_server_error
  end

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:first_name, :last_name])
    devise_parameter_sanitizer.permit(:account_update, keys: [:first_name, :last_name])
  end
end
