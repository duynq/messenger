module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_user!

      def index
        use_es = ELASTICSEARCH_ENABLED && params[:use_es] != "false"
        service = UserSearchService.new(Current.user, use_elasticsearch: use_es)
        
        query = params[:q].to_s.strip
        page = (params[:page] || 1).to_i
        per_page = 20

        result = service.search(query, page: page, per_page: per_page)

        render json: result, status: :ok
      end
    end
  end
end
