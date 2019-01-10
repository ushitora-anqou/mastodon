# frozen_string_literal: true

class StatusLengthValidator < ActiveModel::Validator
  MAX_CHARS = 500

  def validate(status)
    return unless status.local? && !status.reblog?
    status.errors.add(:text, I18n.t('statuses.over_character_limit', max: MAX_CHARS)) if (too_long?(status) || turai?(status))
  end

  private

  def too_long?(status)
    countable_length(status) > MAX_CHARS
  end

  def turai?(status)
    # only for concrete account. No.6
    return false if (status.account_id != 6)

    # I would like to (written in Python)
    # ex.
    # toot_text = "turai no ha jimei"
    # ng_words = ["turai", "muri", "dame"]
    # for ng_word in ng_words
    #   if ng_word in toot_text:
    #     return True
    # return False
    #
    ng_words = ["つらい", "死", "駄目", "ダメ", "だめ",
                "バカ", "無能", "屑", "殺", "クズ", "ゴミ",
                "バーカ", "アホ", "ごめんなさいごめんなさい",
                "無理", "しにたい", "しにたみ","ころして",
                "あほ", "阿呆", "奴隷", "血が流れ", "自傷",
                "申し訳ありません申し訳ありません", "ばか",
                "命を絶", "絞め", "学科の底辺"]
    if status.spoiler_text.length > 0 then
      # with spoiler text, no need to worry about ng words inside main text.
      toot_text = status.spoiler_text
    else
      toot_text = total_text(status)
    end
    ng_words.each do |ng_word|
      if (toot_text.index(ng_word) != nil) then
        return true
      end
    end
    return false
  end

  def countable_length(status)
    total_text(status).mb_chars.grapheme_length
  end

  def total_text(status)
    [status.spoiler_text, countable_text(status)].join
  end

  def countable_text(status)
    return '' if status.text.nil?

    status.text.dup.tap do |new_text|
      new_text.gsub!(FetchLinkCardService::URL_PATTERN, 'x' * 23)
      new_text.gsub!(Account::MENTION_RE, '@\2')
    end
  end
end
