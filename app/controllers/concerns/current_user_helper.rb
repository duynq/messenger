module CurrentUserHelper
  extend ActiveSupport::Concern

  included do
    before_action :set_current_attributes
  end

  private

  def set_current_attributes
    Current.user = current_user
  end

  def find_user_from_jwt_token(token)
    return nil if token.blank?

    jwt_payload = JWT.decode(token, Rails.application.credentials.secret_key_base || ENV.fetch('SECRET_KEY_BASE')).first
    User.find_by(id: jwt_payload['sub'])
  rescue JWT::DecodeError, JWT::ExpiredSignature, ActiveRecord::RecordNotFound
    nil
  end

  def extract_token_from_headers
    request.headers['Authorization']&.split(' ')&.last
  end
end
