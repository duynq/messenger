class ActionCableTicket
  EXPIRES_IN = 5.minutes
  PURPOSE = "action_cable_connection"

  class << self
    def issue(user)
      verifier.generate(
        { user_id: user.id },
        expires_in: EXPIRES_IN,
        purpose: PURPOSE
      )
    end

    def verify(ticket)
      payload = verifier.verified(ticket, purpose: PURPOSE)
      return if payload.blank?

      User.find_by(id: payload[:user_id] || payload["user_id"])
    end

    private

    def verifier
      Rails.application.message_verifier(:action_cable_ticket)
    end
  end
end
