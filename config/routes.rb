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

      # Users List
      resources :users, only: [:index]

      # Conversations
      resources :conversations, only: [:index, :update] do
        member do
          patch :read
          post :mute
          delete :mute, action: :unmute
        end
        resources :messages, only: [:index, :create, :destroy, :update] do
          post :react, on: :member
        end
        resources :participants, only: [:create, :destroy]
        collection do
          post :direct
          post :group
        end
      end

      # Notifications
      resources :notifications, only: [:index, :destroy] do
        member do
          patch :read
        end
        collection do
          get :unread_count
          post :read_all
        end
      end

      # Notification Preferences
      resource :notification_preferences, only: [:show, :update]

      # Account management
      resource :account, only: [:update, :destroy]
    end
  end

  mount ActionCable.server => '/cable'

  root to: proc { [404, {}, ["Not found"]] }
end
