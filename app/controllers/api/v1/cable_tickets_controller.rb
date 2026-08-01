module Api
  module V1
    class CableTicketsController < ApplicationController
      def create
        render json: {
          ticket: ActionCableTicket.issue(Current.user),
          expires_in: ActionCableTicket::EXPIRES_IN.to_i
        }, status: :created
      end
    end
  end
end
