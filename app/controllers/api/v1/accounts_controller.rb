class Api::V1::AccountsController < ApplicationController
  # PATCH /api/v1/account
  def update
    if current_user.update(account_params)
      render json: UserBlueprint.render_as_hash(current_user, view: :with_email_and_storage)
    else
      render json: { error: current_user.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/account
  def destroy
    current_user.destroy!
    render json: { message: "Account deleted successfully." }
  end

  private

  def account_params
    params.require(:account).permit(:first_name, :last_name)
  end
end
