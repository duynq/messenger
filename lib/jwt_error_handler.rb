class JwtErrorHandler
  def initialize(app)
    @app = app
  end

  def call(env)
    @app.call(env)
  rescue JWT::DecodeError, JWT::ExpiredSignature
    body = { error: "Unauthorized" }.to_json

    [
      401,
      {
        "Content-Type" => "application/json; charset=utf-8",
        "Content-Length" => body.bytesize.to_s
      },
      [body]
    ]
  end
end
