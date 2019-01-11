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
    # only for concrete account.
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
                "生きるのは、無理", "しにたい", "しにたみ",
                "あほ", "阿呆", "奴隷", "血が流れ", "自傷",
                "申し訳ありません申し訳ありません", "ばか",
                "命を絶", "絞め", "学科の底辺", "つらすぎ",
                "turai", "愚か者", /ばー*か/, "消えてくれ",
                "くそ", "クソ", "塵", "殴る", "suicide",
                "消えろ", "意義が負の無限大","ころして",
                "辛い", "ころす", "つらみ", "線路に落",
                "腹を切", "身体中に傷を", "命をた", "首吊",
                "ごみかす", "首を吊", "しね", "しんでくれ",
                "唾棄", "生きてて", "いきててごめんなさい",
                "ころせ", "剥奪", "生存権が", "むのう"]
    if status.spoiler_text.empty? then
      # with spoiler text, no need to worry about ng words inside main text.
      toot_text = total_text(status)
    else
      toot_text = status.spoiler_text
    end
    ng_words.any? { |ng_word| toot_text.index(ng_word) }
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
