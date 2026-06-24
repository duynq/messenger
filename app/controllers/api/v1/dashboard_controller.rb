class Api::V1::DashboardController < ApplicationController
  def index
    render json: {
      message: "Welcome to your dashboard!",
      user: UserBlueprint.render_as_hash(current_user, view: :with_email_and_storage)
    }
  end
end
