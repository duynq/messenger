# ──────────────────────────────────────────────────────────
# Example CRUD Controller — replace/extend for your needs
# Demonstrates: pagination, blueprinter, Result pattern
# ──────────────────────────────────────────────────────────
class Api::V1::PostsController < ApplicationController
  before_action :set_post, only: [:show, :update, :destroy]

  # GET /api/v1/posts
  def index
    posts = current_user.posts.order(created_at: :desc)
    pagy_obj, records = pagy(posts)

    render json: {
      posts: PostBlueprint.render_as_hash(records),
      pagination: pagy_metadata(pagy_obj)
    }
  end

  # GET /api/v1/posts/:id
  def show
    render json: PostBlueprint.render_as_hash(@post)
  end

  # POST /api/v1/posts
  def create
    post = current_user.posts.build(post_params)

    if post.save
      render json: PostBlueprint.render_as_hash(post), status: :created
    else
      render json: { error: post.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /api/v1/posts/:id
  def update
    if @post.update(post_params)
      render json: PostBlueprint.render_as_hash(@post)
    else
      render json: { error: @post.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/posts/:id
  def destroy
    @post.destroy!
    render json: { message: "Post deleted successfully." }
  end

  private

  def set_post
    @post = current_user.posts.find(params[:id])
  end

  def post_params
    params.require(:post).permit(:title, :body, :published)
  end
end
