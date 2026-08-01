module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
      Current.user = current_user
    end

    private

    def find_verified_user
      ticket = request.params[:ticket]
      return reject_unauthorized_connection if ticket.blank?

      ActionCableTicket.verify(ticket) || reject_unauthorized_connection
    end
  end
end
