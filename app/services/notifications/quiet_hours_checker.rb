module Notifications
  class QuietHoursChecker
    def self.quiet?(start_time:, end_time:, timezone:)
      return false if start_time.blank? || end_time.blank? || timezone.blank?

      # Get current time in the user's timezone
      tz = ActiveSupport::TimeZone[timezone]
      return false unless tz

      current_time = Time.current.in_time_zone(tz)
      current_seconds = current_time.hour * 3600 + current_time.min * 60

      start_seconds = time_to_seconds(start_time)
      end_seconds = time_to_seconds(end_time)

      if start_seconds <= end_seconds
        # Example: 08:00 to 17:00
        current_seconds >= start_seconds && current_seconds < end_seconds
      else
        # Example: 22:00 to 08:00 (overnight)
        current_seconds >= start_seconds || current_seconds < end_seconds
      end
    end

    def self.time_to_seconds(time_str)
      hours, minutes = time_str.split(':').map(&:to_i)
      hours * 3600 + minutes * 60
    end
  end
end
