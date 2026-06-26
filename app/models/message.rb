class Message < ApplicationRecord
  include SoftDeletable

  belongs_to :conversation
  belongs_to :user
end
