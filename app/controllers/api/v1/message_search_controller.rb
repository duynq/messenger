module Api
  module V1
    class MessageSearchController < ApplicationController
      before_action :authenticate_user!

      def index
        query = params[:q].to_s.strip
        return render json: { messages: [], meta: { has_next: false } } if query.blank?

        use_es = ELASTICSEARCH_ENABLED && params[:use_es] != "false"
        service = MessageSearchService.new(Current.user, use_elasticsearch: use_es)

        page = (params[:page] || 1).to_i
        per_page = 20

        result = service.search(query, conversation_id: params[:conversation_id], page: page, per_page: per_page)

        render json: result
      end
    end
  end
end
