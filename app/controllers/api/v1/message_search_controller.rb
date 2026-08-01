module Api
  module V1
    class MessageSearchController < ApplicationController
      before_action :authenticate_user!

      def index
        query = params[:q].to_s.strip
        use_es = ELASTICSEARCH_ENABLED && params[:use_es] != "false"
        result = MessageSearchService.call(
          user: Current.user,
          query: query,
          conversation_id: params[:conversation_id],
          page: [params.fetch(:page, 1).to_i, 1].max,
          per_page: 20,
          use_elasticsearch: use_es
        )

        render json: result, status: :ok
      end
    end
  end
end
