module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
      Current.user = current_user
    end

    private

    def find_verified_user
      token = request.params[:token] || request.headers['Authorization']&.split(' ')&.last
      return reject_unauthorized_connection if token.blank?

      jwt_payload = JWT.decode(token, Rails.application.credentials.secret_key_base || ENV.fetch('SECRET_KEY_BASE')).first
      User.find_by(id: jwt_payload['sub']) || reject_unauthorized_connection
    rescue JWT::DecodeError, JWT::ExpiredSignature
      reject_unauthorized_connection
    end
  end
end
