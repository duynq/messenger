Rails.application.routes.draw do
  mount Rswag::Ui::Engine => '/api-docs'
  mount Rswag::Api::Engine => '/api-docs'
  # ──────────────────────────────────────────────
  # Authentication (Devise + JWT)
  # ──────────────────────────────────────────────
  scope 'api/v1' do
    devise_for :users, controllers: {
      sessions: "api/v1/users/sessions",
      registrations: "api/v1/users/registrations"
    }
  end

  namespace :api do
    namespace :v1 do
      # Dashboard
      get "dashboard", to: "dashboard#index"


      # Account management
      resource :account, only: [:update, :destroy]
    end
  end

  root to: proc { [404, {}, ["Not found"]] }
end
