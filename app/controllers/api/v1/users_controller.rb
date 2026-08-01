module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_user!

      def index
        use_es = ELASTICSEARCH_ENABLED && params[:use_es] != "false"
        query = params[:q].to_s.strip
        page = params[:page].present? ? [params[:page].to_i, 1].max : nil
        per_page = 20

        result = UserSearchService.call(
          user: Current.user,
          query: query,
          cursor: params[:cursor],
          page: page,
          per_page: per_page,
          use_elasticsearch: use_es
        )

        render json: result, status: :ok
      end
    end
  end
end
